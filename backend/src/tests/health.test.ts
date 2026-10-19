import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('App health endpoint', () => {
  it('returns a healthy status payload', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'ok');
  });
});
