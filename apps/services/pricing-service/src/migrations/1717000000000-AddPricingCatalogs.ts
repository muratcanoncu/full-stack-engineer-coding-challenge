import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Adds the pricing-catalog data model: versioned catalogs and their positions,
 * surcharges, and catalog-level discounts. Also adds the per-trade
 * `pricing_schema` column used to validate position attributes.
 *
 * Conventions (see 1704067200000-Init.ts):
 *  - Every table is created under the `pricing_service` schema; the prefix is
 *    always spelled out in `name`.
 *  - TypeORM API only — no raw `CREATE TABLE`.
 *  - `down` reverses `up` exactly, in reverse order.
 *
 * The unique partial index that enforces "at most one active PUBLISHED version
 * per (craftsman, trade)" is intentionally NOT added here — it ships with the
 * publish/concurrency feature in its own migration.
 */
export class AddPricingCatalogs1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_versions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'craftsman_id', type: 'uuid' },
          { name: 'trade', type: 'varchar', length: '32' },
          { name: 'status', type: 'varchar', length: '16', default: "'DRAFT'" },
          { name: 'effective_from', type: 'date' },
          { name: 'published_by_user_id', type: 'varchar', length: '64', isNullable: true },
          { name: 'published_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.catalog_versions',
      new TableIndex({
        name: 'idx_catalog_versions_craftsman_trade',
        columnNames: ['craftsman_id', 'trade'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_positions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '64' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'unit', type: 'varchar', length: '16' },
          { name: 'net_price_cents', type: 'bigint' },
          { name: 'vat_rate', type: 'numeric', precision: 6, scale: 4 },
          { name: 'min_quantity', type: 'numeric', precision: 12, scale: 3, isNullable: true },
          { name: 'max_quantity', type: 'numeric', precision: 12, scale: 3, isNullable: true },
          { name: 'attributes', type: 'jsonb', default: "'{}'::jsonb" },
        ],
        uniques: [
          {
            name: 'uniq_position_version_key',
            columnNames: ['version_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.catalog_positions',
      new TableIndex({
        name: 'idx_catalog_positions_version_id',
        columnNames: ['version_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_positions',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.position_surcharges',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'position_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '64' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'kind', type: 'varchar', length: '16' },
          { name: 'amount_cents', type: 'bigint', isNullable: true },
          { name: 'percent', type: 'numeric', precision: 6, scale: 5, isNullable: true },
        ],
        uniques: [
          {
            name: 'uniq_surcharge_position_key',
            columnNames: ['position_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.position_surcharges',
      new TableIndex({
        name: 'idx_position_surcharges_position_id',
        columnNames: ['position_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.position_surcharges',
      new TableForeignKey({
        columnNames: ['position_id'],
        referencedTableName: 'pricing_service.catalog_positions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_discounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '64' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'kind', type: 'varchar', length: '16' },
          { name: 'amount_cents', type: 'bigint', isNullable: true },
          { name: 'percent', type: 'numeric', precision: 6, scale: 5, isNullable: true },
          { name: 'cap_cents', type: 'bigint', isNullable: true },
          { name: 'applies_to', type: 'jsonb', default: '\'"subtotal"\'::jsonb' },
          { name: 'sort_order', type: 'int', default: 0 },
        ],
        uniques: [
          {
            name: 'uniq_discount_version_key',
            columnNames: ['version_id', 'key'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.catalog_discounts',
      new TableIndex({
        name: 'idx_catalog_discounts_version_id',
        columnNames: ['version_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_discounts',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.addColumn(
      'pricing_service.trade_configs',
      new TableColumn({ name: 'pricing_schema', type: 'jsonb', isNullable: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pricing_service.trade_configs', 'pricing_schema');
    await queryRunner.dropTable('pricing_service.catalog_discounts', true);
    await queryRunner.dropTable('pricing_service.position_surcharges', true);
    await queryRunner.dropTable('pricing_service.catalog_positions', true);
    await queryRunner.dropTable('pricing_service.catalog_versions', true);
  }
}
