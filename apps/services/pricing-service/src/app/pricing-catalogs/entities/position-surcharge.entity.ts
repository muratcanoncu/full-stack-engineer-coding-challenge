import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CatalogPosition } from './catalog-position.entity';
import { bigIntTransformer, numericTransformer } from './column-transformers';

export type SurchargeKind = 'flat' | 'percent';

/**
 * An optional surcharge declared on a position. A quote line may opt in to any
 * subset of its position's surcharges. `flat` uses `amountCents`; `percent`
 * uses `percent` (e.g. 0.10 = +10%).
 */
@Entity({ schema: 'pricing_service', name: 'position_surcharges' })
@Unique('uniq_surcharge_position_key', ['positionId', 'key'])
export class PositionSurcharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'position_id', type: 'uuid' })
  @Index()
  positionId: string;

  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'varchar', length: 16 })
  kind: SurchargeKind;

  @Column({ name: 'amount_cents', type: 'bigint', nullable: true, transformer: bigIntTransformer })
  amountCents: number | null;

  @Column({ type: 'numeric', precision: 6, scale: 5, nullable: true, transformer: numericTransformer })
  percent: number | null;

  @ManyToOne(() => CatalogPosition, (p) => p.surcharges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'position_id' })
  position: CatalogPosition;
}
