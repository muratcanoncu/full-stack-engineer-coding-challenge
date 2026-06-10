import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogPosition } from './catalog-position.entity';
import { CatalogDiscount } from './catalog-discount.entity';

export type CatalogVersionStatus = 'DRAFT' | 'PUBLISHED';

/**
 * A pricing catalog version for a `(craftsmanId, trade)` pair.
 *
 * A version is mutable while `DRAFT` and immutable once `PUBLISHED`. Published
 * versions are never edited or deleted — they stay readable for audit. The
 * version that is "active" at an instant `t` is the published version with the
 * greatest `effectiveFrom <= t`; because that is a total order over
 * `effectiveFrom`, two versions can never be active at the same instant.
 */
@Entity({ schema: 'pricing_service', name: 'catalog_versions' })
@Index(['craftsmanId', 'trade'])
export class CatalogVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'craftsman_id', type: 'uuid' })
  craftsmanId: string;

  @Column({ type: 'varchar', length: 32 })
  trade: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status: CatalogVersionStatus;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  // Stored as an opaque string: user identity is owned by auth-service and
  // there is no cross-schema FK, so we do not constrain it to a uuid type.
  @Column({ name: 'published_by_user_id', type: 'varchar', length: 64, nullable: true })
  publishedByUserId: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CatalogPosition, (p) => p.version, { cascade: true })
  positions: CatalogPosition[];

  @OneToMany(() => CatalogDiscount, (d) => d.version, { cascade: true })
  discounts: CatalogDiscount[];
}
