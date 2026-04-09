export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export class Order {
    public id: number;

    public productIds: number[];

    public totalPrice: number;

    public createdAt: Date;

    public status: OrderStatus;

    constructor(productsIds: number[], totalPrice: number) {
        if (productsIds.length < 1 || productsIds.length > 5) {
            throw new Error('An order must contain between 1 and 5 products.');
        }

        if (totalPrice < 2 || totalPrice > 500) {
            throw new Error('Total price must be between 2 and 500.');
        }

        this.createdAt = new Date();
        this.status = OrderStatus.PENDING;

        this.totalPrice = totalPrice;
        this.productIds = productsIds;
    }
}
