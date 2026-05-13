import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Initial schema for the pricing-service.
 *
 * Convention notes for candidates:
 *  - Every table is created under the `pricing_service` schema. Always include
 *    the schema prefix in `name`.
 *  - Use the TypeORM API (`createTable`, `createIndex`, etc.) — not raw SQL
 *    `CREATE TABLE`.
 *  - The `down` path reverses `up` exactly, in reverse order.
 *  - Never edit this file after it has been merged. Add a new migration for any
 *    schema change.
 *
 * Note: there is intentionally no `users` table here. User identity is owned
 * by `auth-service` (schema `auth_service`). Pricing-service reads the user
 * out of the JWT only — never via a join.
 */
export class Init1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS pricing_service');

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.craftsmen',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'company_name', type: 'varchar', length: '255' },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'phone', type: 'varchar', length: '50', isNullable: true },
          { name: 'vat_number', type: 'varchar', length: '50', isNullable: true },
          { name: 'address_line_1', type: 'varchar', length: '255', isNullable: true },
          { name: 'address_line_2', type: 'varchar', length: '255', isNullable: true },
          { name: 'postal_code', type: 'varchar', length: '20', isNullable: true },
          { name: 'city', type: 'varchar', length: '100', isNullable: true },
          { name: 'country', type: 'varchar', length: '100', isNullable: true, default: "'Germany'" },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.craftsmen',
      new TableIndex({ name: 'idx_craftsmen_company_name', columnNames: ['company_name'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.craftsman_trade_assignments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'craftsman_id', type: 'uuid' },
          { name: 'trade', type: 'varchar', length: '32' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [
          {
            name: 'uniq_craftsman_trade',
            columnNames: ['craftsman_id', 'trade'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.craftsman_trade_assignments',
      new TableForeignKey({
        columnNames: ['craftsman_id'],
        referencedTableName: 'pricing_service.craftsmen',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.trade_configs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'trade', type: 'varchar', length: '32', isUnique: true },
          { name: 'display_name', type: 'varchar', length: '100' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'metadata', type: 'jsonb', default: "'{}'::jsonb" },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pricing_service.trade_configs', true);
    await queryRunner.dropTable('pricing_service.craftsman_trade_assignments', true);
    await queryRunner.dropIndex('pricing_service.craftsmen', 'idx_craftsmen_company_name');
    await queryRunner.dropTable('pricing_service.craftsmen', true);
  }
}
