import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Enforces "at most one active PUBLISHED version per (craftsman, trade)" and
 * serializes concurrent publishes.
 *
 * A partial unique index on (craftsman_id, trade, effective_from) WHERE
 * status = 'PUBLISHED' guarantees no two published versions for the same
 * craftsman+trade share an effective date. Because "active at instant t" is the
 * published version with the greatest effective_from <= t, distinct effective
 * dates give non-overlapping active intervals. Two concurrent publishes that
 * target the same effective date can't both commit — the loser hits this unique
 * violation, which the service maps to 409 Conflict.
 */
export class AddPublishedVersionUniqueIndex1717100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'pricing_service.catalog_versions',
      new TableIndex({
        name: 'uniq_published_version_active',
        columnNames: ['craftsman_id', 'trade', 'effective_from'],
        isUnique: true,
        where: "status = 'PUBLISHED'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('pricing_service.catalog_versions', 'uniq_published_version_active');
  }
}
