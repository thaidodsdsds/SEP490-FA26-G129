import dataSource from './dataSource.js';
import { AppError } from '../common/errors.js';
import { ERROR_CODES } from '../common/constants.js';

export const initializeDatabase = async () => {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const result = await dataSource.query('SELECT 1');
    if (!result || result.length === 0) {
      throw new AppError('PostgreSQL is reachable but returned an unexpected response.', 500, ERROR_CODES.DATABASE_ERROR);
    }

    return dataSource;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database connection failed.';
    throw new AppError(
      `Database connection failed: ${message}. Check PostgreSQL credentials, host, and that the database is running and reachable.`,
      500,
      ERROR_CODES.DATABASE_ERROR,
      { originalError: message },
      { cause: error },
    );
  }
};

export const closeDatabase = async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};
