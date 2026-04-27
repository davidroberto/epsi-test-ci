import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { Express } from 'express';
import { Product } from '../src/module/product/Product';
import { buildApp } from '../src/config/app';
import { buildDataSourceOptions } from '../src/config/db.config';

describe('Product API - E2E', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;
    let app: Express;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16')
            .withExposedPorts(5432)
            .start();

        dataSource = new DataSource(
            buildDataSourceOptions({
                host: container.getHost(),
                port: container.getPort(),
                username: container.getUsername(),
                password: container.getPassword(),
                database: container.getDatabase(),
                migrationsRun: true,
            })
        );

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
            .send({ title: 'switch 2', description: 'nouvelle console', price: 500, category: 'console' })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);

        const products = await dataSource.getRepository(Product).find();
        expect(products).toHaveLength(1);
        expect(products[0].title).toBe('switch 2');
    });

    test('POST /api/product - titre trop court retourne 400', async () => {
        const response = await request(app)
            .post('/api/product')
            .send({ title: 'sw', description: 'desc', price: 500, category: 'console' })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('titre trop court');
    });

    test('POST /api/product/:id - modification réussie', async () => {
        await dataSource.getRepository(Product).clear();

        const product = await dataSource.getRepository(Product).save({
            title: 'original',
            description: 'desc',
            price: 100,
            category: 'divers',
        });

        const response = await request(app)
            .post(`/api/product/${product.id}`)
            .send({ title: 'modifié', description: 'nouvelle desc', price: 200, category: 'divers' })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);

        const updated = await dataSource.getRepository(Product).findOneBy({ id: product.id });
        expect(updated.title).toBe('modifié');
        expect(updated.price).toBe(200);
    });

    test('POST /api/product/:id - produit inexistant retourne 400', async () => {

        await dataSource.getRepository(Product).clear();

        const response = await request(app)
            .post('/api/product/99999')
            .send({ title: 'test', description: 'desc', price: 100, category: 'divers' })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Product not found');
    });
});
