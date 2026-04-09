import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { Express } from 'express';
import { Product } from '../src/module/product/Product';
import { buildApp } from '../src/config/app';

describe('Product API - E2E', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;
    let app: Express;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16')
            .withExposedPorts(5432)
            .start();

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
            entitySkipConstructor: true,
        });

        await dataSource.initialize();

        const AppDataSource = (await import('../src/config/db.config')).default;
        Object.assign(AppDataSource, dataSource);

        app = buildApp();
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    test('GET /api/health retourne 200', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    test('POST /api/product - création réussie', async () => {
        await dataSource.getRepository(Product).clear();

        const response = await request(app)
            .post('/api/product')
            .send({ title: 'switch 2', description: 'nouvelle console', price: 500 })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(1);
        expect(products[0].title).toBe('switch 2');
    });

});
