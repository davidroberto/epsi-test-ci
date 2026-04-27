import express, { Request, Response } from 'express';
import { CreateProductTypeOrmRepository } from './createProductTypeOrmRepository';
import { CreateProductUseCase } from './createProductUseCase';

const router = express.Router();

router.post('/product', async (request: Request, response: Response) => {
    const { title, description, price, category } = request.body;

    const createProductTypeOrmRepository = new CreateProductTypeOrmRepository();
    const createProductUseCase = new CreateProductUseCase(createProductTypeOrmRepository);

    try {
        await createProductUseCase.execute({ title, description, price, category });
    } catch (error) {
        if (error instanceof Error) {
            return response.status(400).json({ message: error.message });
        }

        return response.status(500).json({ message: 'Internal server error' });
    }

    return response.status(201).json();
});

export default router;
