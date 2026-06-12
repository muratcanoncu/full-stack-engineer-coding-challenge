import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { JwtPayload, UserRole } from '@sandbox/types';

import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CatalogVersion } from './entities/catalog-version.entity';
import { CatalogPosition } from './entities/catalog-position.entity';
import { CatalogDiscount, DiscountAppliesTo } from './entities/catalog-discount.entity';
import { CreateCatalogVersionDto } from './dto/create-catalog-version.dto';
import { UpdateCatalogVersionDto } from './dto/update-catalog-version.dto';
import { QueryCatalogVersionsDto } from './dto/query-catalog-versions.dto';
import { CreatePositionDto } from './dto/catalog-position.dto';
import { CreateDiscountDto } from './dto/catalog-discount.dto';
import {
  CatalogVersionResponseDto,
  CatalogVersionSummaryDto,
} from './dto/catalog-version-response.dto';

const VERSION_RELATIONS = ['positions', 'positions.surcharges', 'discounts'];

@Injectable()
export class PricingCatalogsService {
  private readonly logger = new Logger(PricingCatalogsService.name);

  constructor(
    @InjectRepository(CatalogVersion) private readonly versions: Repository<CatalogVersion>,
    @InjectRepository(Craftsman) private readonly craftsmen: Repository<Craftsman>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: QueryCatalogVersionsDto,
    user: JwtPayload,
  ): Promise<CatalogVersionSummaryDto[]> {
    const qb = this.versions.createQueryBuilder('v');

    if (query.trade) {
      qb.andWhere('v.trade = :trade', { trade: query.trade });
    }

    if (this.isCraftsmanOnly(user)) {
      // A craftsman only ever sees their own versions, regardless of the filter.
      if (!user.craftsmanId) {
        return [];
      }
      qb.andWhere('v.craftsman_id = :craftsmanId', { craftsmanId: user.craftsmanId });
    } else if (query.craftsmanId) {
      qb.andWhere('v.craftsman_id = :craftsmanId', { craftsmanId: query.craftsmanId });
    }

    qb.orderBy('v.created_at', 'DESC');
    const items = await qb.getMany();
    return items.map(CatalogVersionSummaryDto.from);
  }

  async findOne(versionId: string, user: JwtPayload): Promise<CatalogVersionResponseDto> {
    const version = await this.loadVersionOrThrow(versionId);
    this.assertCanAccess(version.craftsmanId, user);
    return CatalogVersionResponseDto.fromVersion(version);
  }

  async create(
    dto: CreateCatalogVersionDto,
    user: JwtPayload,
  ): Promise<CatalogVersionResponseDto> {
    this.assertCanAccess(dto.craftsmanId, user);

    const craftsman = await this.craftsmen.findOne({ where: { id: dto.craftsmanId } });
    if (!craftsman) {
      throw new NotFoundException(`Craftsman ${dto.craftsmanId} not found`);
    }

    const positions = dto.positions ?? [];
    const discounts = dto.discounts ?? [];
    this.assertUniqueKeys(positions, discounts);
    const positionKeys = new Set(positions.map((p) => p.key));
    discounts.forEach((d) => this.assertAppliesTo(d.appliesTo, positionKeys));

    const saved = await this.dataSource.transaction(async (tx) => {
      const version = await tx.getRepository(CatalogVersion).save(
        tx.getRepository(CatalogVersion).create({
          craftsmanId: dto.craftsmanId,
          trade: dto.trade,
          status: 'DRAFT',
          effectiveFrom: dto.effectiveFrom,
          publishedByUserId: null,
          publishedAt: null,
        }),
      );

      await this.replacePositions(tx, version.id, positions);
      await this.replaceDiscounts(tx, version.id, discounts);

      this.logger.log(`Created draft version ${version.id} for ${dto.craftsmanId}/${dto.trade}`);
      return this.loadVersionOrThrow(version.id, tx);
    });

    return CatalogVersionResponseDto.fromVersion(saved);
  }

  async update(
    versionId: string,
    dto: UpdateCatalogVersionDto,
    user: JwtPayload,
  ): Promise<CatalogVersionResponseDto> {
    const version = await this.loadVersionOrThrow(versionId);
    this.assertCanAccess(version.craftsmanId, user);
    if (version.status !== 'DRAFT') {
      throw new BadRequestException('A published version is immutable and cannot be edited');
    }

    // Effective position keys after this edit (new set if replacing, else current).
    const effectivePositions = dto.positions ?? version.positions ?? [];
    const positionKeys = new Set(effectivePositions.map((p) => p.key));
    if (dto.positions || dto.discounts) {
      this.assertUniqueKeys(dto.positions ?? [], dto.discounts ?? []);
    }
    if (dto.discounts) {
      dto.discounts.forEach((d) => this.assertAppliesTo(d.appliesTo, positionKeys));
    }

    const saved = await this.dataSource.transaction(async (tx) => {
      const repo = tx.getRepository(CatalogVersion);
      if (dto.effectiveFrom !== undefined) {
        version.effectiveFrom = dto.effectiveFrom;
      }
      await repo.save(version);

      if (dto.positions) {
        await this.replacePositions(tx, versionId, dto.positions);
      }
      if (dto.discounts) {
        await this.replaceDiscounts(tx, versionId, dto.discounts);
      }

      this.logger.log(`Updated draft version ${versionId}`);
      return this.loadVersionOrThrow(versionId, tx);
    });

    return CatalogVersionResponseDto.fromVersion(saved);
  }

  async publish(versionId: string, user: JwtPayload): Promise<CatalogVersionResponseDto> {
    const version = await this.loadVersionOrThrow(versionId);
    this.assertCanAccess(version.craftsmanId, user);
    if (version.status === 'PUBLISHED') {
      throw new BadRequestException('Version is already published');
    }

    try {
      await this.dataSource.transaction(async (tx) => {
        version.status = 'PUBLISHED';
        version.publishedByUserId = user.sub;
        version.publishedAt = new Date();
        await tx.getRepository(CatalogVersion).save(version);
      });
    } catch (err) {
      // The partial unique index rejects a second active published version for
      // the same craftsman+trade+effectiveFrom (e.g. a concurrent publish race).
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Another published version is already active for ${version.trade} effective ${version.effectiveFrom}`,
        );
      }
      throw err;
    }

    this.logger.log(`Published version ${versionId} by ${user.sub}`);
    const published = await this.loadVersionOrThrow(versionId);
    return CatalogVersionResponseDto.fromVersion(published);
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }

  // ---------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------

  private async replacePositions(
    tx: EntityManager,
    versionId: string,
    positions: CreatePositionDto[],
  ): Promise<void> {
    // Deleting a position cascades to its surcharges via the FK.
    await tx.getRepository(CatalogPosition).delete({ versionId });
    if (positions.length === 0) {
      return;
    }
    const entities = positions.map((p) =>
      tx.getRepository(CatalogPosition).create({
        versionId,
        key: p.key,
        label: p.label,
        unit: p.unit,
        netPriceCents: p.netPriceCents,
        vatRate: p.vatRate,
        minQuantity: p.minQuantity ?? null,
        maxQuantity: p.maxQuantity ?? null,
        attributes: p.attributes ?? {},
        surcharges: (p.surcharges ?? []).map((s) => ({
          key: s.key,
          label: s.label,
          kind: s.kind,
          amountCents: s.kind === 'flat' ? s.amountCents ?? 0 : null,
          percent: s.kind === 'percent' ? s.percent ?? 0 : null,
        })),
      }),
    );
    // Cascade persists the nested surcharges.
    await tx.getRepository(CatalogPosition).save(entities);
  }

  private async replaceDiscounts(
    tx: EntityManager,
    versionId: string,
    discounts: CreateDiscountDto[],
  ): Promise<void> {
    await tx.getRepository(CatalogDiscount).delete({ versionId });
    if (discounts.length === 0) {
      return;
    }
    const entities = discounts.map((d, index) =>
      tx.getRepository(CatalogDiscount).create({
        versionId,
        key: d.key,
        label: d.label,
        kind: d.kind,
        amountCents: d.kind === 'flat' ? d.amountCents ?? 0 : null,
        percent: d.kind === 'percent' ? d.percent ?? 0 : null,
        capCents: d.capCents ?? null,
        appliesTo: d.appliesTo ?? 'subtotal',
        sortOrder: d.sortOrder ?? index,
      }),
    );
    await tx.getRepository(CatalogDiscount).save(entities);
  }

  private async loadVersionOrThrow(
    versionId: string,
    manager?: EntityManager,
  ): Promise<CatalogVersion> {
    const repo = manager ? manager.getRepository(CatalogVersion) : this.versions;
    const version = await repo.findOne({ where: { id: versionId }, relations: VERSION_RELATIONS });
    if (!version) {
      throw new NotFoundException(`Catalog version ${versionId} not found`);
    }
    return version;
  }

  // ---------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------

  private assertUniqueKeys(positions: CreatePositionDto[], discounts: CreateDiscountDto[]): void {
    this.assertNoDuplicates(positions.map((p) => p.key), 'position');
    this.assertNoDuplicates(discounts.map((d) => d.key), 'discount');
    positions.forEach((p) =>
      this.assertNoDuplicates((p.surcharges ?? []).map((s) => s.key), `surcharge on position "${p.key}"`),
    );
  }

  private assertNoDuplicates(keys: string[], label: string): void {
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) {
        throw new BadRequestException(`Duplicate ${label} key "${key}"`);
      }
      seen.add(key);
    }
  }

  private assertAppliesTo(value: DiscountAppliesTo | undefined, positionKeys: Set<string>): void {
    if (value === undefined || value === 'subtotal') {
      return;
    }
    if (
      typeof value !== 'object' ||
      value === null ||
      !Array.isArray((value as { positionKeys?: unknown }).positionKeys)
    ) {
      throw new BadRequestException("appliesTo must be 'subtotal' or { positionKeys: string[] }");
    }
    const keys = (value as { positionKeys: unknown[] }).positionKeys;
    if (!keys.every((k): k is string => typeof k === 'string')) {
      throw new BadRequestException('appliesTo.positionKeys must be an array of strings');
    }
    const missing = keys.filter((k) => !positionKeys.has(k));
    if (missing.length > 0) {
      throw new BadRequestException(`appliesTo references unknown position keys: ${missing.join(', ')}`);
    }
  }

  // ---------------------------------------------------------------------
  // Authorization helpers
  // ---------------------------------------------------------------------

  private isCraftsmanOnly(user: JwtPayload): boolean {
    return user.roles.includes(UserRole.CRAFTSMAN) && !user.roles.includes(UserRole.ADMIN);
  }

  /**
   * Row-level scoping. ADMIN bypasses; a CRAFTSMAN may only touch catalogs whose
   * `craftsmanId` matches the one bound to their JWT.
   */
  private assertCanAccess(craftsmanId: string, user: JwtPayload): void {
    if (!this.isCraftsmanOnly(user)) {
      return;
    }
    if (user.craftsmanId !== craftsmanId) {
      throw new ForbiddenException('Craftsmen may only access their own catalogs');
    }
  }
}
