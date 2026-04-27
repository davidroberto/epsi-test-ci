import { UpdateProductRepository } from './updateProductRepository';

type UpdateProductCommand = {
    id: number;
    title: string;
    description: string;
    price: number;
    category: string;
};

export class UpdateProductUsecase {
    private productRepository: UpdateProductRepository;

    constructor(productRepository: UpdateProductRepository) {
        this.productRepository = productRepository;
    }

    async execute(command: UpdateProductCommand): Promise<void> {
        const { id: productId, title, description, price, category } = command;

        const product = await this.productRepository.findOneById(productId);

        if (!product) {
            throw new Error('Product not found');
        }

        product.update(title, description, price, category);

        try {
            return await this.productRepository.save(product);
        } catch (error) {
            throw new Error('Error updating product');
        }
    }
}
