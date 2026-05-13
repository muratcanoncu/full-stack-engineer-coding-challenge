import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './app/auth/entities/user.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'pricing',
  schema: process.env.DATABASE_SCHEMA ?? 'auth_service',
  entities: [User],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsRun: false,
  synchronize: false,
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
