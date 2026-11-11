import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { findRoles, getRepository } = vi.hoisted(() => ({
  findRoles: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
  },
}));

import app from '../app.js';

describe('Roles API', () => {
  beforeEach(() => {
    findRoles.mockReset();
    getRepository.mockReset().mockReturnValue({ find: findRoles });
  });

  it('returns roles with public fields and account counts', async () => {
    const roles = [
      { id: 1, name: 'Admin', accounts: [{ id: 1 }, { id: 2 }] },
      { id: 2, name: 'Customer', accounts: [] },
    ];
    findRoles.mockResolvedValue(roles);

    const response = await request(app).get('/api/v1/admin/roles');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        { id: 1, name: 'Admin', account_count: 2 },
        { id: 2, name: 'Customer', account_count: 0 },
      ],
      meta: null,
    });
    expect(getRepository).toHaveBeenCalledOnce();
    expect(findRoles).toHaveBeenCalledWith({ relations: ['accounts'] });
  });

  it('forwards database errors to the API error handler', async () => {
    findRoles.mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/api/v1/admin/roles');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      error: { message: 'Internal server error.' },
    });
  });
});
