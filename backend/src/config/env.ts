import dotenv from 'dotenv';

dotenv.config();

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'change_me',
    database: process.env.DB_DATABASE || 'isocal',
    ssl: toBoolean(process.env.DB_SSL, false),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  wsPath: process.env.WS_PATH || '/ws',
} as const;

export default env;
