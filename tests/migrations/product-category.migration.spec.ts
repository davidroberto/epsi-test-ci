import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource, DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions } from '../../src/config/db.config';

describe('Migration: AddCategory (data preservation)', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16')
            .withExposedPorts(5432)
            .start();

        const options: DataSourceOptions = buildDataSourceOptions({
            host: container.getHost(),
            port: container.getPort(),
            username: container.getUsername(),
            password: container.getPassword(),
            database: container.getDatabase(),
        });
        dataSource = new DataSource(options);
        await dataSource.initialize();
    }, 120_000);

    afterAll(async () => {
        if (dataSource?.isInitialized) await dataSource.destroy();
        if (container) await container.stop();
    });

    test('preserves existing product rows through expand/backfill/contract', async () => {
        // 1. État "prod" : on applique uniquement la baseline, pas les migrations category.
        //    On simule en exécutant directement le DDL de la baseline et en marquant
        //    cette migration comme déjà jouée dans typeorm_migrations.
        await dataSource.query(`
            CREATE TABLE "product" (
                "id" SERIAL NOT NULL,
                "price" double precision,
                "title" character varying(255) NOT NULL,
                "description" text,
                CONSTRAINT "PK_product_id" PRIMARY KEY ("id")
            )
        `);
        await dataSource.query(`
            CREATE TABLE "typeorm_migrations" (
                "id" SERIAL NOT NULL,
                "timestamp" bigint NOT NULL,
                "name" character varying NOT NULL,
                CONSTRAINT "PK_typeorm_migrations" PRIMARY KEY ("id")
            )
        `);
        await dataSource.query(
            `INSERT INTO "typeorm_migrations" ("timestamp", "name") VALUES (1700000000000, 'InitialSchema1700000000000')`
        );

        // 2. Données représentatives d'une prod existante.
        await dataSource.query(`
            INSERT INTO "product" ("title", "price", "description") VALUES
                ('switch 2', 500, 'console nintendo'),
                ('clavier mecanique', 80, NULL),
                ('produit edge case', 9999.99, 'prix max'),
                ('xyz', 1, 'prix min')
        `);

        const before = await dataSource.query(
            `SELECT id, title, price, description FROM "product" ORDER BY id`
        );
        expect(before).toHaveLength(4);

        // 3. On applique les 3 migrations category.
        const applied = await dataSource.runMigrations();
        expect(applied.map((m) => m.name)).toEqual([
            'AddCategoryNullable1700000001000',
            'BackfillCategory1700000002000',
            'MakeCategoryNotNull1700000003000',
        ]);

        // 4. Aucune perte : les valeurs originales sont identiques row-par-row.
        const after = await dataSource.query(
            `SELECT id, title, price, description, category FROM "product" ORDER BY id`
        );
        expect(after).toHaveLength(before.length);

        after.forEach((row: any, i: number) => {
            expect(row.id).toBe(before[i].id);
            expect(row.title).toBe(before[i].title);
            expect(Number(row.price)).toBe(Number(before[i].price));
            expect(row.description).toBe(before[i].description);
            expect(row.category).toBe('uncategorized');
        });

        // 5. Schéma final : la colonne est bien NOT NULL et varchar(100).
        const cols = await dataSource.query(`
            SELECT is_nullable, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'product' AND column_name = 'category'
        `);
        expect(cols).toHaveLength(1);
        expect(cols[0].is_nullable).toBe('NO');
        expect(cols[0].data_type).toBe('character varying');
        expect(Number(cols[0].character_maximum_length)).toBe(100);

        // 6. Une insertion sans category est désormais rejetée par la DB.
        await expect(
            dataSource.query(
                `INSERT INTO "product" ("title", "price") VALUES ('sans cat', 10)`
            )
        ).rejects.toThrow();
    });
    
});
