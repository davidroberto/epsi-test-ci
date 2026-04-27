import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCategoryNotNull1700000003000 implements MigrationInterface {
    name = 'MakeCategoryNotNull1700000003000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "product" ALTER COLUMN "category" SET NOT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "product" ALTER COLUMN "category" DROP NOT NULL`
        );
    }
}
