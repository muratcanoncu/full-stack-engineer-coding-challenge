import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CatalogVersion } from './catalog-version.entity';
import { bigIntTransformer, numericTransformer } from './column-transformers';

export type DiscountKind = 'flat' | 'percent';

/** Where a discount applies: across the whole subtotal, or a subset of positions. */
export type DiscountAppliesTo = 'subtotal' | { positionKeys: string[] };

/**
 * A catalog-level discount. Discounts are applied in `sortOrder` (declaration
 * order). A `percent` discount may carry a `capCents` ceiling, applied before
 * the next discount stacks on top.
 */
@Entity({ schema: 'pricing_service', name: 'catalog_discounts' })
@Unique('uniq_discount_version_key', ['versionId', 'key'])
export class CatalogDiscount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  @Index()
  versionId: string;

  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 16 })
  kind: DiscountKind;

  @Column({ name: 'amount_cents', type: 'bigint', nullable: true, transformer: bigIntTransformer })
  amountCents: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 5, nullable: true, transformer: numericTransformer })
  percent: number | null;

  @Column({ name: 'cap_cents', type: 'bigint', nullable: true, transformer: bigIntTransformer })
  capCents: number | null;

  @Column({ name: 'applies_to', type: 'jsonb', default: '"subtotal"' })
  appliesTo: DiscountAppliesTo;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => CatalogVersion, (v) => v.discounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: CatalogVersion;
}
