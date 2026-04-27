import { CreateProductRepository } from './createProductRepository';
import { Product } from '../Product';

export class CreateProductUseCase {
    private productRepository: CreateProductRepository;

    constructor(productRepository: CreateProductRepository) {
        this.productRepository = productRepository;
    }

    async execute({
        title,
        description,
        price,
        category
    }: {
        title: string;
        description: string;
        price: number;
        category: string;
    }): Promise<void> {
        const product = new Product({ title, description, price, category });

        try {
            await this.productRepository.save(product);
        } catch (error) {
            throw new Error('erreur lors de la création du produit');
        }
    }
}
