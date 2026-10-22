import 'reflect-metadata';
import { DataSource } from 'typeorm';
import env from '../config/env.js';
import { entities } from './entities.js';
import CreateRolesAndCustomers from './migrations/1792500000000-CreateRolesAndCustomers.js';
import CreateAccounts from './migrations/1792510000000-CreateAccounts.js';
import SeedSampleData from './migrations/1792520000000-SeedSampleData.js';
import RealignRoles from './migrations/1792530000000-RealignRoles.js';
import FixSeedAccountRoles from './migrations/1792540000000-FixSeedAccountRoles.js';

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
  migrations: [CreateRolesAndCustomers, CreateAccounts, SeedSampleData, RealignRoles, FixSeedAccountRoles],
  migrationsTableName: 'migrations',
  subscribers: [],
});

export default dataSource;
