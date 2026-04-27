import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ nullable: true, type: 'float' })
    public price: number;

    @Column({ type: 'varchar', length: 255 })
    public title: string;

    @Column({ type: 'text', nullable: true })
    public description: string;

    @Column({ type: 'varchar', length: 100 })
    public category: string;

    constructor({
        title,
        description,
        price,
        category
    }: {
        title: string;
        description: string;
        price: number;
        category: string;
    }) {
        this.checkPrice(price);
        this.validateTitle(title);
        this.validateCategory(category);
        this.title = title;
        this.description = description;
        this.price = price;
        this.category = category;
    }

    update(title: string, description: string, price: number, category: string) {
        this.checkPrice(price);
        this.validateTitle(title);
        this.validateCategory(category);

        this.title = title;
        this.description = description;
        this.price = price;
        this.category = category;
    }

    private validateTitle(title: string) {
        if (title.length < 3) {
            throw new Error('titre trop court');
        }
    }

    private validateCategory(category: string) {
        if (!category || category.length === 0) {
            throw new Error('catégorie obligatoire');
        }
    }

    private checkPrice(price: number) {
        if (price <= 0) {
            throw new Error('le prix doit être supérieur à 0');
        }

        if (price > 10000) {
            throw new Error('le prix doit être inférieur à 10000');
        }
    }
}
