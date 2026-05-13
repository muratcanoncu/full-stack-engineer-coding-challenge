import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Craftsman } from './craftsman.entity';

/**
 * Joins a craftsman to a trade category they cover. A craftsman may cover any
 * number of trades, but each (craftsman, trade) pair is unique.
 */
@Entity({ schema: 'pricing_service', name: 'craftsman_trade_assignments' })
@Unique(['craftsmanId', 'trade'])
export class CraftsmanTradeAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'craftsman_id', type: 'uuid' })
  @Index()
  craftsmanId: string;

  /**
   * Trade code referencing `trade_configs.trade`. Stored as a plain string
   * rather than an enum so adding a new trade is a data migration only.
   */
  @Column({ type: 'varchar', length: 32 })
  @Index()
  trade: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Craftsman, (c) => c.tradeAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'craftsman_id' })
  craftsman: Craftsman;
}
