import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dataSource } = vi.hoisted(() => ({
  dataSource: {
    isInitialized: false,
    initialize: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('../database/dataSource.js', () => ({ default: dataSource }));

import { initializeDatabase } from '../database/databaseService.js';

describe('Database service', () => {
  beforeEach(() => {
    dataSource.isInitialized = false;
    dataSource.initialize.mockReset();
    dataSource.query.mockReset();
  });

  it('preserves the original driver error for startup diagnostics', async () => {
    const driverError = Object.assign(new Error('password authentication failed'), {
      code: '28P01',
    });
    dataSource.initialize.mockRejectedValue(driverError);

    await expect(initializeDatabase()).rejects.toMatchObject({
      message: expect.stringContaining('password authentication failed'),
      code: 'DATABASE_ERROR',
      cause: driverError,
    });
  });
});
