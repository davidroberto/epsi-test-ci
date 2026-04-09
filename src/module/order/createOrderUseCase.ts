import { Order } from './Order';
import { OrderTypeOrmRepository } from './orderTypeOrmRepository';

export class CreateOrderUseCase {
    constructor(private orderTypeOrmRepository: OrderTypeOrmRepository) {}

    async execute(productIds: number[], totalPrice: number): Promise<Order> {
        const order = new Order(productIds, totalPrice);

        return await this.orderTypeOrmRepository.save(order);
    }
}
