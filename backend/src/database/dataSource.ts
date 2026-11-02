import 'reflect-metadata';
import { DataSource } from 'typeorm';
import env from '../config/env.js';
import { entities } from './entities.js';

const dataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.nodeEnv === 'development',
  entities,
  migrations: ["src/database/migrations/*.ts"],
  migrationsTableName: 'migrations',
  subscribers: [],
});

export default dataSource;
