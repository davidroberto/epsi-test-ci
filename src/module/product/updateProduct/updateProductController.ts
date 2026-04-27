import express, { Request, Response } from 'express';
import { UpdateProductTypeOrmRepository } from './updateProductTypeOrmRepository';
import { UpdateProductUsecase } from './updateProductUseCase';

const router = express.Router();

router.post('/product/:id', async (request: Request, response: Response) => {
    const id = parseInt(request.params.id as string);
    const { title, description, price, category } = request.body;

    const updateProductTypeOrmRepository = new UpdateProductTypeOrmRepository();
    const updateProductUseCase = new UpdateProductUsecase(updateProductTypeOrmRepository);

    try {
        await updateProductUseCase.execute({ id, title, description, price, category });
    } catch (error) {
        if (error instanceof Error) {
            return response.status(400).json({ message: error.message });
        }

        return response.status(500).json({ message: 'Internal server error' });
    }

    return response.status(201).json();
});

export default router;
