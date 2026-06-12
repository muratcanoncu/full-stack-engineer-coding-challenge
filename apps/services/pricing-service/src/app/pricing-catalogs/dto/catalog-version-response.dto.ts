import { ApiProperty } from '@nestjs/swagger';
import { PositionUnit } from '@sandbox/types';
import { CatalogVersion, CatalogVersionStatus } from '../entities/catalog-version.entity';
import { CatalogPosition } from '../entities/catalog-position.entity';
import { PositionSurcharge, SurchargeKind } from '../entities/position-surcharge.entity';
import { CatalogDiscount, DiscountAppliesTo, DiscountKind } from '../entities/catalog-discount.entity';

export class SurchargeResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() kind: SurchargeKind;
  @ApiProperty({ nullable: true }) amountCents: number | null;
  @ApiProperty({ nullable: true }) percent: number | null;

  static from(s: PositionSurcharge): SurchargeResponseDto {
    return { key: s.key, label: s.label, kind: s.kind, amountCents: s.amountCents, percent: s.percent };
  }
}

export class PositionResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() unit: PositionUnit;
  @ApiProperty() netPriceCents: number;
  @ApiProperty() vatRate: number;
  @ApiProperty({ nullable: true }) minQuantity: number | null;
  @ApiProperty({ nullable: true }) maxQuantity: number | null;
  @ApiProperty({ type: Object }) attributes: Record<string, unknown>;
  @ApiProperty({ type: [SurchargeResponseDto] }) surcharges: SurchargeResponseDto[];

  static from(p: CatalogPosition): PositionResponseDto {
    return {
      key: p.key,
      label: p.label,
      unit: p.unit,
      netPriceCents: p.netPriceCents,
      vatRate: p.vatRate,
      minQuantity: p.minQuantity,
      maxQuantity: p.maxQuantity,
      attributes: p.attributes ?? {},
      surcharges: (p.surcharges ?? []).map(SurchargeResponseDto.from),
    };
  }
}

export class DiscountResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() kind: DiscountKind;
  @ApiProperty({ nullable: true }) amountCents: number | null;
  @ApiProperty({ nullable: true }) percent: number | null;
  @ApiProperty({ nullable: true }) capCents: number | null;
  @ApiProperty() appliesTo: DiscountAppliesTo;
  @ApiProperty() sortOrder: number;

  static from(d: CatalogDiscount): DiscountResponseDto {
    return {
      key: d.key,
      label: d.label,
      kind: d.kind,
      amountCents: d.amountCents,
      percent: d.percent,
      capCents: d.capCents,
      appliesTo: d.appliesTo,
      sortOrder: d.sortOrder,
    };
  }
}

/** Lightweight shape used for the list endpoint (no nested collections). */
export class CatalogVersionSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() craftsmanId: string;
  @ApiProperty() trade: string;
  @ApiProperty() status: CatalogVersionStatus;
  @ApiProperty() effectiveFrom: string;
  @ApiProperty({ nullable: true }) publishedByUserId: string | null;
  @ApiProperty({ nullable: true }) publishedAt: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;

  static from(v: CatalogVersion): CatalogVersionSummaryDto {
    return {
      id: v.id,
      craftsmanId: v.craftsmanId,
      trade: v.trade,
      status: v.status,
      effectiveFrom: v.effectiveFrom,
      publishedByUserId: v.publishedByUserId,
      publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }
}

/** Full version including positions (with surcharges) and discounts. */
export class CatalogVersionResponseDto extends CatalogVersionSummaryDto {
  @ApiProperty({ type: [PositionResponseDto] }) positions: PositionResponseDto[];
  @ApiProperty({ type: [DiscountResponseDto] }) discounts: DiscountResponseDto[];

  static fromVersion(v: CatalogVersion): CatalogVersionResponseDto {
    return {
      ...CatalogVersionSummaryDto.from(v),
      positions: (v.positions ?? []).map(PositionResponseDto.from),
      discounts: (v.discounts ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(DiscountResponseDto.from),
    };
  }
}
