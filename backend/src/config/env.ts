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
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
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
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@isocal.com',
  },
  wsPath: process.env.WS_PATH || '/ws',
  cloudinary: {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUD_NAME ||
      process.env.CLOUDINARY_NAME ||
      '',
    apiKey:
      process.env.CLOUDINARY_API_KEY ||
      process.env.API_KEY ||
      process.env.CLOUDINARY_KEY ||
      '',
    apiSecret:
      process.env.CLOUDINARY_API_SECRET ||
      process.env.API_SECRET ||
      process.env.CLOUDINARY_SECRET ||
      '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'isocal',
    cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  },
} as const;

export default env;
