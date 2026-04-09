import { describe, expect, test } from '@jest/globals';
import { CreateProductUseCase } from '../createProductUseCase';
import { CreateProductRepository } from '../createProductRepository';
import { Product } from '../../Product';

class CreateProductDummyRepository implements CreateProductRepository {
    async save(product: Product): Promise<void> {
        // Ne fait rien, c'est un dummy
    }
}

class CreateProductMockFailRepository implements CreateProductRepository {
    async save(product: Product): Promise<void> {
        throw new Error('fail gtredeapkdzepnip ');
    }
}

describe('US-1 : Créer un produit', () => {
    test('Scénario 1 : création réussie', async () => {
        const createProductRepository = new CreateProductDummyRepository();
        const createProductUseCase = new CreateProductUseCase(createProductRepository);

        await expect(
            createProductUseCase.execute({
                title: 'switch 2',
                description: 'nouvelle console',
                price: 500
            })
        ).resolves.not.toThrow();
    });

    test('Scénario 2 : echec, titre trop court', async () => {
        const createProductRepository = new CreateProductDummyRepository();
        const createProductUseCase = new CreateProductUseCase(createProductRepository);

        await expect(
            createProductUseCase.execute({
                title: 'sw',
                description: 'nouvelle console',
                price: 500
            })
        ).rejects.toThrow('titre trop court');
    });

    test('Scénario 3 : echec, prix négatif', async () => {
        const createProductRepository = new CreateProductDummyRepository();
        const createProductUseCase = new CreateProductUseCase(createProductRepository);

        await expect(
            createProductUseCase.execute({
                title: 'switch 2',
                description: 'nouvelle console',
                price: -10
            })
        ).rejects.toThrow('le prix doit être supérieur à 0');
    });

    test('Scénario 4 : création échouée, prix supérieur à 10000', async () => {
        const createProductRepository = new CreateProductDummyRepository();
        const createProductUseCase = new CreateProductUseCase(createProductRepository);

        await expect(
            createProductUseCase.execute({
                title: 'switch 2',
                description: 'nouvelle console',
                price: 11000
            })
        ).rejects.toThrow('le prix doit être inférieur à 10000');
    });

    test('Scénario 5 : création échouée, échec de sauvegarde non prévue', async () => {
        const createProductRepository = new CreateProductMockFailRepository();
        const createProductUseCase = new CreateProductUseCase(createProductRepository);

        await expect(
            createProductUseCase.execute({
                title: 'switch 2',
                description: 'nouvelle console',
                price: 500
            })
        ).rejects.toThrow('erreur lors de la création du produit');
    });
});
