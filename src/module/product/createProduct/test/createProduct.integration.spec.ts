import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { Product } from '../../Product';
import { CreateProductTypeOrmRepository } from '../createProductTypeOrmRepository';
import AppDataSource from '../../../../config/db.config';

describe('CreateProductTypeOrmRepository - Integration', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16').withExposedPorts(5432).start();

        dataSource = new DataSource({
            type: 'postgres',
            host: container.getHost(),
            port: container.getPort(),
            username: container.getUsername(),
            password: container.getPassword(),
            database: container.getDatabase(),
            logging: false,
            entities: [Product],
            synchronize: true,
            entitySkipConstructor: true
        });

        await dataSource.initialize();

        Object.assign(AppDataSource, dataSource);
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    test('devrait sauvegarder un produit en base de données', async () => {
        const repository = new CreateProductTypeOrmRepository();
        const product = new Product({
            title: 'switch 2',
            description: 'nouvelle console',
            price: 500
        });

        await repository.save(product);

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(1);
        expect(products[0].title).toBe('switch 2');
        expect(products[0].description).toBe('nouvelle console');
        expect(products[0].price).toBe(500);
    });

    test('devrait sauvegarder plusieurs produits en base de données', async () => {
        await dataSource.getRepository(Product).clear();

        const repository = new CreateProductTypeOrmRepository();

        const product1 = new Product({
            title: 'switch 2',
            description: 'nouvelle console',
            price: 500
        });

        const product2 = new Product({
            title: 'playstation 6',
            description: 'console next gen',
            price: 700
        });

        await repository.save(product1);
        await repository.save(product2);

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(2);
    });
});
