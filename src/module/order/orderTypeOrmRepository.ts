import AppDataSource from '../../config/db.config';
import { Order } from './Order';

export class OrderTypeOrmRepository {
    async save(order: Order): Promise<Order> {
        const typeOrmRepository = AppDataSource.getRepository<Order>(Order);
        return await typeOrmRepository.save(order);
    }
}
