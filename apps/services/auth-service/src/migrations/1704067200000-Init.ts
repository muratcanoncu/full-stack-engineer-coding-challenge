import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Initial schema for the auth-service.
 *
 * Convention notes:
 *  - All tables live under the `auth_service` schema.
 *  - Use the TypeORM API, not raw SQL `CREATE TABLE`.
 *  - Never edit this file after merge — add a new migration instead.
 */
export class Init1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS auth_service');

    await queryRunner.createTable(
      new Table({
        name: 'auth_service.users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'roles', type: 'varchar', isArray: true, length: '32' },
          { name: 'craftsman_id', type: 'uuid', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_service.users', true);
  }
}
