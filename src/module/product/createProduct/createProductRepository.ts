import { Product } from '../Product';

export interface CreateProductRepository {
    save(product: Product): Promise<void>;
}
