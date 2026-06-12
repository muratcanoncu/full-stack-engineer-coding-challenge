import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, QueryFailedError, Repository } from 'typeorm';
import { JwtPayload, UserRole } from '@sandbox/types';

import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CatalogVersion } from './entities/catalog-version.entity';
import { CatalogPosition } from './entities/catalog-position.entity';
import { CatalogDiscount } from './entities/catalog-discount.entity';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { CreateCatalogVersionDto } from './dto/create-catalog-version.dto';

type Repo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const adminUser: JwtPayload = {
  sub: 'admin-id',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
  craftsmanId: null,
};

const craftsmanUser: JwtPayload = {
  sub: 'partner-user-id',
  email: 'partner@example.com',
  roles: [UserRole.CRAFTSMAN],
  craftsmanId: 'craftsman-1',
};

const otherCraftsmanUser: JwtPayload = { ...craftsmanUser, craftsmanId: 'craftsman-2' };

function buildVersion(overrides: Partial<CatalogVersion> = {}): CatalogVersion {
  const now = new Date('2026-06-01T00:00:00.000Z');
  return {
    id: 'v1',
    craftsmanId: 'craftsman-1',
    trade: 'HVAC',
    status: 'DRAFT',
    effectiveFrom: '2026-06-01',
    publishedByUserId: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    positions: [],
    discounts: [],
    ...overrides,
  } as CatalogVersion;
}

function uniqueViolationError(): QueryFailedError {
  const driverError = new Error('duplicate key value violates unique constraint') as Error & {
    code: string;
  };
  driverError.code = '23505';
  return new QueryFailedError('q', [], driverError);
}

function validCreateDto(overrides: Partial<CreateCatalogVersionDto> = {}): CreateCatalogVersionDto {
  return {
    craftsmanId: 'craftsman-1',
    trade: 'HVAC',
    effectiveFrom: '2026-06-01',
    positions: [
      { key: 'p1', label: 'Boiler', unit: 'piece', netPriceCents: 120000, vatRate: 0.19 },
    ],
    discounts: [],
    ...overrides,
  };
}

describe('PricingCatalogsService', () => {
  let service: PricingCatalogsService;
  let versionsRepo: Repo<CatalogVersion>;
  let craftsmenRepo: Repo<Craftsman>;
  let txVersionRepo: Repo<CatalogVersion>;
  let txPositionRepo: Repo<CatalogPosition>;
  let txDiscountRepo: Repo<CatalogDiscount>;
  let qb: { [key: string]: jest.Mock };

  beforeEach(async () => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([buildVersion()]),
    };
    versionsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn().mockResolvedValue(buildVersion()),
    };
    craftsmenRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'craftsman-1' } as Craftsman),
    };
    txVersionRepo = {
      create: jest.fn().mockImplementation((x: CatalogVersion) => x),
      save: jest.fn().mockImplementation((x: CatalogVersion) => Promise.resolve({ ...x, id: 'v1' })),
      findOne: jest.fn().mockResolvedValue(buildVersion()),
    };
    txPositionRepo = {
      create: jest.fn().mockImplementation((x: CatalogPosition) => x),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    txDiscountRepo = {
      create: jest.fn().mockImplementation((x: CatalogDiscount) => x),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === CatalogVersion) return txVersionRepo as unknown as Repository<CatalogVersion>;
        if (entity === CatalogPosition) return txPositionRepo as unknown as Repository<CatalogPosition>;
        return txDiscountRepo as unknown as Repository<CatalogDiscount>;
      },
    };
    const dataSource = {
      transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) => cb(manager)),
    } as unknown as DataSource;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingCatalogsService,
        { provide: getRepositoryToken(CatalogVersion), useValue: versionsRepo },
        { provide: getRepositoryToken(Craftsman), useValue: craftsmenRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(PricingCatalogsService);
  });

  describe('list', () => {
    it('returns versions for admin', async () => {
      const result = await service.list({}, adminUser);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('v1');
    });

    it('scopes the query to the caller for a CRAFTSMAN', async () => {
      await service.list({}, craftsmanUser);
      expect(qb.andWhere).toHaveBeenCalledWith('v.craftsman_id = :craftsmanId', {
        craftsmanId: 'craftsman-1',
      });
    });

    it('returns an empty list when a CRAFTSMAN has no craftsmanId', async () => {
      const result = await service.list({}, { ...craftsmanUser, craftsmanId: null });
      expect(result).toEqual([]);
      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the full version for admin', async () => {
      const result = await service.findOne('v1', adminUser);
      expect(result.id).toBe('v1');
      expect(result.positions).toEqual([]);
    });

    it('throws NotFoundException when the version is missing', async () => {
      versionsRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne('v1', adminUser)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when a CRAFTSMAN reads another craftsman catalog', async () => {
      await expect(service.findOne('v1', otherCraftsmanUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows a CRAFTSMAN to read their own catalog', async () => {
      const result = await service.findOne('v1', craftsmanUser);
      expect(result.id).toBe('v1');
    });
  });

  describe('create', () => {
    it('throws ForbiddenException when a CRAFTSMAN creates for another craftsman', async () => {
      await expect(
        service.create(validCreateDto({ craftsmanId: 'craftsman-2' }), craftsmanUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when the craftsman does not exist', async () => {
      craftsmenRepo.findOne!.mockResolvedValue(null);
      await expect(service.create(validCreateDto(), adminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('persists a DRAFT version with its positions', async () => {
      const result = await service.create(validCreateDto(), adminUser);
      expect(txVersionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT', craftsmanId: 'craftsman-1', trade: 'HVAC' }),
      );
      expect(txPositionRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ key: 'p1', versionId: 'v1' }),
      ]);
      expect(result.id).toBe('v1');
    });

    it('rejects duplicate position keys', async () => {
      const dto = validCreateDto({
        positions: [
          { key: 'p1', label: 'A', unit: 'piece', netPriceCents: 100, vatRate: 0.19 },
          { key: 'p1', label: 'B', unit: 'piece', netPriceCents: 200, vatRate: 0.19 },
        ],
      });
      await expect(service.create(dto, adminUser)).rejects.toThrow(/Duplicate position key/);
    });

    it('rejects a discount that targets an unknown position key', async () => {
      const dto = validCreateDto({
        discounts: [
          { key: 'd1', label: 'Promo', kind: 'percent', percent: 0.1, appliesTo: { positionKeys: ['nope'] } },
        ],
      });
      await expect(service.create(dto, adminUser)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the version is missing', async () => {
      versionsRepo.findOne!.mockResolvedValue(null);
      await expect(service.update('v1', { effectiveFrom: '2026-07-01' }, adminUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when a CRAFTSMAN edits another craftsman catalog', async () => {
      await expect(
        service.update('v1', { effectiveFrom: '2026-07-01' }, otherCraftsmanUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects editing a PUBLISHED version', async () => {
      versionsRepo.findOne!.mockResolvedValue(buildVersion({ status: 'PUBLISHED' }));
      await expect(
        service.update('v1', { effectiveFrom: '2026-07-01' }, adminUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces positions on a DRAFT version', async () => {
      await service.update(
        'v1',
        { positions: [{ key: 'p2', label: 'Pump', unit: 'piece', netPriceCents: 50000, vatRate: 0.19 }] },
        adminUser,
      );
      expect(txPositionRepo.delete).toHaveBeenCalledWith({ versionId: 'v1' });
      expect(txPositionRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ key: 'p2', versionId: 'v1' }),
      ]);
    });
  });

  describe('publish', () => {
    it('transitions a DRAFT to PUBLISHED and stamps the publisher', async () => {
      await service.publish('v1', adminUser);
      expect(txVersionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PUBLISHED',
          publishedByUserId: 'admin-id',
          publishedAt: expect.any(Date),
        }),
      );
    });

    it('rejects publishing a version that is already PUBLISHED (publish twice)', async () => {
      versionsRepo.findOne!.mockResolvedValue(buildVersion({ status: 'PUBLISHED' }));
      await expect(service.publish('v1', adminUser)).rejects.toBeInstanceOf(BadRequestException);
      expect(txVersionRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the version is missing', async () => {
      versionsRepo.findOne!.mockResolvedValue(null);
      await expect(service.publish('v1', adminUser)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when a CRAFTSMAN publishes another craftsman catalog', async () => {
      await expect(service.publish('v1', otherCraftsmanUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('maps a unique-violation to ConflictException', async () => {
      txVersionRepo.save!.mockRejectedValue(uniqueViolationError());
      await expect(service.publish('v1', adminUser)).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets exactly one of two concurrent publishes win', async () => {
      // Each request loads its own row, both DRAFT at read time.
      versionsRepo.findOne!.mockImplementation(() => Promise.resolve(buildVersion()));
      // The DB index admits the first write and rejects the second with 23505.
      txVersionRepo.save!
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(uniqueViolationError());

      const results = await Promise.allSettled([
        service.publish('v1', adminUser),
        service.publish('v1', adminUser),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    });
  });
});
