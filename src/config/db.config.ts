import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Product } from '../module/product/Product';
import { Order } from '../module/order/Order';
config({ path: '.env.local' });

export const buildDataSourceOptions = (
    overrides: Partial<DataSourceOptions> = {}
): DataSourceOptions =>
    ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PW,
        database: process.env.DB_NAME,
        logging: false,
        entities: [Product, Order],
        migrations: [__dirname + '/../migrations/*.{ts,js}'],
        migrationsTableName: 'typeorm_migrations',
        synchronize: false,
        migrationsRun: false,
        entitySkipConstructor: true,
        ...overrides,
    } as DataSourceOptions);

const AppDataSource = new DataSource(buildDataSourceOptions());

export default AppDataSource;
