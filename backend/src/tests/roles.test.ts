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

  it('returns roles with only public fields, ordered by code', async () => {
    const roles = [
      { id: 1, code: 'ADMIN', name: 'Admin' },
      { id: 2, code: 'CUSTOMER', name: 'Customer' },
    ];
    findRoles.mockResolvedValue(roles);

    const response = await request(app).get('/api/v1/roles');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: roles,
      meta: null,
    });
    expect(getRepository).toHaveBeenCalledOnce();
    expect(findRoles).toHaveBeenCalledWith({
      select: { id: true, code: true, name: true },
      order: { code: 'ASC' },
    });
  });

  it('forwards database errors to the API error handler', async () => {
    findRoles.mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/api/v1/roles');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      error: { message: 'Database unavailable' },
    });
  });
});
