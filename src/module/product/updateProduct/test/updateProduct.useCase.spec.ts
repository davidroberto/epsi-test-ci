import { describe, expect, test } from '@jest/globals';
import { UpdateProductUsecase } from '../updateProductUseCase';
import { UpdateProductRepository } from '../updateProductRepository';
import { Product } from '../../Product';

class UpdateProductRepositoryMock implements UpdateProductRepository {
    async findOneById(id: number): Promise<Product | null> {
        const product = new Product({
            title: 'switch',
            description: 'console de jeu',
            price: 3000
        });
        product.id = 2;
        return product;
    }

    async save(product: Product): Promise<void> {
        // mock: no-op
    }
}

describe('US-1 : Modifier un produit', () => {
    test('Scénario 1 : modification réussie', async () => {
        const updateProductRepositoryMock = new UpdateProductRepositoryMock();
        const updateProductUseCase = new UpdateProductUsecase(updateProductRepositoryMock);

        await expect(
            updateProductUseCase.execute({
                id: 2,
                title: 'switch 3',
                description: 'nouvelle nouvelle console',
                price: 5000
            })
        ).resolves.not.toThrow();
    });

    test('Scénario 2 : titre trop court', async () => {
        const updateProductRepositoryMock = new UpdateProductRepositoryMock();
        const updateProductUseCase = new UpdateProductUsecase(updateProductRepositoryMock);

        await expect(
            updateProductUseCase.execute({
                id: 2,
                title: 'sw',
                description: 'nouvelle nouvelle console',
                price: 5000
            })
        ).rejects.toThrow('titre trop court');
    });

    test('Scénario 3 : prix inférieur à 0', async () => {
        const updateProductRepositoryMock = new UpdateProductRepositoryMock();
        const updateProductUseCase = new UpdateProductUsecase(updateProductRepositoryMock);

        await expect(
            updateProductUseCase.execute({
                id: 2,
                title: 'switch 3',
                description: 'nouvelle nouvelle console',
                price: -10
            })
        ).rejects.toThrow('le prix doit être supérieur à 0');
    });
});
