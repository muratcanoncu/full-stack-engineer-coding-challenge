import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PositionUnit } from '@sandbox/types';
import { CatalogVersion } from './catalog-version.entity';
import { PositionSurcharge } from './position-surcharge.entity';
import { bigIntTransformer, numericTransformer } from './column-transformers';

/**
 * A single priced position within a catalog version. The trade-specific
 * attribute object lives in `attributes` (jsonb) and is validated against the
 * trade's `pricingSchema` on every draft write.
 */
@Entity({ schema: 'pricing_service', name: 'catalog_positions' })
@Unique('uniq_position_version_key', ['versionId', 'key'])
export class CatalogPosition {
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
  unit: PositionUnit;

  /** Net unit price in euro cents. */
  @Column({ name: 'net_price_cents', type: 'bigint', transformer: bigIntTransformer })
  netPriceCents: number;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 6, scale: 4, transformer: numericTransformer })
  vatRate: number;

  @Column({ name: 'min_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true, transformer: numericTransformer })
  minQuantity: number | null;

  @Column({ name: 'max_quantity', type: 'numeric', precision: 12, scale: 3, nullable: true, transformer: numericTransformer })
  maxQuantity: number | null;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;

  @ManyToOne(() => CatalogVersion, (v) => v.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: CatalogVersion;

  @OneToMany(() => PositionSurcharge, (s) => s.position, { cascade: true })
  surcharges: PositionSurcharge[];
}
