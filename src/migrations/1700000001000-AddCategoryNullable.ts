import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryNullable1700000001000 implements MigrationInterface {
    name = 'AddCategoryNullable1700000001000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "product" ADD COLUMN "category" character varying(100)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "category"`);
    }
}
