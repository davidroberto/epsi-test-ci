import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCategory1700000002000 implements MigrationInterface {
    name = 'BackfillCategory1700000002000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "product" SET "category" = 'uncategorized' WHERE "category" IS NULL`
        );
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // no-op : impossible de distinguer les lignes backfillées des autres.
    }
}
