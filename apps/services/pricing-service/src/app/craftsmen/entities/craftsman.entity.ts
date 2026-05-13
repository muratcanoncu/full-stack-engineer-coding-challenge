import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CraftsmanTradeAssignment } from './craftsman-trade-assignment.entity';

/**
 * A craftsman is a business that provides services in one or more trade
 * categories. Trade assignments link a craftsman to the trades they cover.
 */
@Entity({ schema: 'pricing_service', name: 'craftsmen' })
export class Craftsman {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  @Index()
  companyName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'vat_number', type: 'varchar', length: 50, nullable: true })
  vatNumber: string | null;

  @Column({ name: 'address_line_1', type: 'varchar', length: 255, nullable: true })
  addressLine1: string | null;

  @Column({ name: 'address_line_2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Germany' })
  country: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CraftsmanTradeAssignment, (a) => a.craftsman)
  tradeAssignments: CraftsmanTradeAssignment[];
}
