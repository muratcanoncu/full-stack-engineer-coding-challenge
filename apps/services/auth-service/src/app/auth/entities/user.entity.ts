import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@sandbox/types';

/**
 * Auth user. Owned by the `auth_service` schema. Other services know users
 * only via the JWT claims — never via a foreign key into this table.
 */
@Entity({ schema: 'auth_service', name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index({ unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32, array: true })
  roles: UserRole[];

  /**
   * For CRAFTSMAN users: the craftsman id this user is bound to. This is the
   * pricing-service craftsman id, but auth-service does not enforce the FK —
   * craftsman identity lives in pricing-service.
   */
  @Column({ name: 'craftsman_id', type: 'uuid', nullable: true })
  craftsmanId: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
