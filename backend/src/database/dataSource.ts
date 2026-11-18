import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import env from '../config/env.js';
import { entities } from './entities.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsGlob = path
  .join(moduleDir, 'migrations', '*.{ts,js}')
  .replaceAll('\\', '/');

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
  migrations: [migrationsGlob],
  migrationsTableName: 'migrations',
  subscribers: [],
});

export default dataSource;
