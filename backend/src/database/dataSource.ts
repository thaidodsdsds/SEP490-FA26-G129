import 'reflect-metadata';
import { DataSource } from 'typeorm';
import env from '../config/env.js';
import { entities } from './entities.js';
import AlignIsocalSchema from './migrations/1792400000000-AlignIsocalSchemaV14.js';
import AddQuotationContractLink from './migrations/1792410000000-AddQuotationContractLink.js';

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
  migrations: [AlignIsocalSchema, AddQuotationContractLink],
  migrationsTableName: 'migrations',
  subscribers: [],
});

export default dataSource;
