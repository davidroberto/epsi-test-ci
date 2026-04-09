import express, { Request, Response } from 'express';
import cors from 'cors';
import createProductController from '../module/product/createProduct/createProductController';
import updateProductController from '../module/product/updateProduct/updateProductController';

export function buildApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req: Request, res: Response) => {
        res.send('OK');
    });

    app.use('/api', createProductController);
    app.use('/api', updateProductController);

    return app;
}
