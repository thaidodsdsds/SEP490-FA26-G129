import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { Customer, Device } from '../database/entities.js';

const {
  findCustomers,
  findOneCustomer,
  findDevices,
  findOneDevice,
  createDevice,
  saveDevice,
  getRepository,
} = vi.hoisted(() => ({
  findCustomers: vi.fn(),
  findOneCustomer: vi.fn(),
  findDevices: vi.fn(),
  findOneDevice: vi.fn(),
  createDevice: vi.fn(),
  saveDevice: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales') => jwt.sign(
  { id: 8, role },
  env.jwt.secret,
  { expiresIn: '5m' },
);

describe('Customers Module API', () => {
  beforeEach(() => {
    findCustomers.mockReset();
    findOneCustomer.mockReset();
    findDevices.mockReset();
    findOneDevice.mockReset();
    createDevice.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveDevice.mockReset();
    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Customer) {
        return {
          find: findCustomers,
          findOne: findOneCustomer,
        };
      }
      if (entity === Device) {
        return {
          find: findDevices,
          findOne: findOneDevice,
          create: createDevice,
          save: saveDevice,
        };
      }
      return { find: vi.fn() };
    });
  });

  describe('GET /api/v1/customers', () => {
    it('requires an authenticated account', async () => {
      const unauthenticated = await request(app).get('/api/v1/customers');
      expect(unauthenticated.status).toBe(401);
    });

    it('returns customer list with only id and company_name ordered by company_name', async () => {
      const mockCustomers = [
        { id: 1, company_name: 'ABC Calibration Company' },
        { id: 2, company_name: 'Vietnam Precision Engineering Co., Ltd.' },
      ];
      findCustomers.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockCustomers,
        meta: null,
      });
      expect(getRepository).toHaveBeenCalledWith(Customer);
      expect(findCustomers).toHaveBeenCalledWith({
        select: {
          id: true,
          company_name: true,
        },
        order: {
          company_name: 'ASC',
        },
      });
    });

    it('forwards database errors to the API error handler', async () => {
      findCustomers.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: { message: 'Database error' },
      });
    });
  });

  describe('GET /api/v1/customers/:customerId/devices', () => {
    it('requires an authenticated account', async () => {
      const unauthenticated = await request(app).get('/api/v1/customers/1/devices');
      expect(unauthenticated.status).toBe(401);
    });

    it('returns 400 when customerId is not a positive integer', async () => {
      const response = await request(app)
        .get('/api/v1/customers/abc/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid customer ID.',
        },
      });
      expect(findDevices).not.toHaveBeenCalled();
    });

    it('returns all devices belonging to the customer', async () => {
      const mockDevices = [
        {
          id: 10,
          customer_id: 1,
          name: 'Đồng hồ vạn năng',
          model: '289',
          manufacturer: 'Fluke',
          serial_number: 'FL-289-20041',
          internal_code: 'TB-00041',
        },
      ];
      findDevices.mockResolvedValue(mockDevices);

      const response = await request(app)
        .get('/api/v1/customers/1/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockDevices,
        meta: null,
      });
      expect(getRepository).toHaveBeenCalledWith(Device);
      expect(findDevices).toHaveBeenCalledWith({
        select: {
          id: true,
          customer_id: true,
          name: true,
          model: true,
          manufacturer: true,
          serial_number: true,
          internal_code: true,
        },
        where: {
          customer_id: 1,
        },
        order: {
          name: 'ASC',
          id: 'ASC',
        },
      });
    });

    it('forwards database errors to the API error handler', async () => {
      findDevices.mockRejectedValue(new Error('Device query failed'));

      const response = await request(app)
        .get('/api/v1/customers/1/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: { message: 'Device query failed' },
      });
    });
  });

  describe('POST /api/v1/customers/:customerId/devices', () => {
    it('requires an authenticated account', async () => {
      const unauthenticated = await request(app)
        .post('/api/v1/customers/1/devices')
        .send({ name: 'Đồng hồ đo áp suất' });
      expect(unauthenticated.status).toBe(401);
    });

    it('returns 400 when name is missing or blank', async () => {
      const response = await request(app)
        .post('/api/v1/customers/1/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Device name is required.',
        },
      });
      expect(saveDevice).not.toHaveBeenCalled();
    });

    it('returns 404 when the customer does not exist', async () => {
      findOneCustomer.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/customers/999/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({ name: 'Đồng hồ đo áp suất' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Customer not found.',
        },
      });
      expect(saveDevice).not.toHaveBeenCalled();
    });

    it('returns 409 when internal_code or serial_number already exists', async () => {
      findOneCustomer.mockResolvedValue({ id: 1 });
      findOneDevice.mockResolvedValueOnce({ id: 5 });

      const response = await request(app)
        .post('/api/v1/customers/1/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({
          name: 'Đồng hồ đo áp suất',
          internal_code: 'TB-00041',
        });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Device internal code already exists.',
        },
      });
    });

    it('creates a new device with auto-generated internal_code when omitted', async () => {
      findOneCustomer.mockResolvedValue({ id: 1 });
      findOneDevice.mockResolvedValue(null);
      saveDevice.mockImplementation(async (device) => ({
        id: 25,
        ...device,
      }));

      const response = await request(app)
        .post('/api/v1/customers/1/devices')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({
          name: 'Đồng hồ đo áp suất',
          manufacturer: 'Fluke',
          model: '700G',
          serial_number: 'FL-700G-001',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 25,
        customer_id: 1,
        name: 'Đồng hồ đo áp suất',
        manufacturer: 'Fluke',
        model: '700G',
        serial_number: 'FL-700G-001',
        is_group2: false,
        status: 'Active',
      });
      expect(response.body.data.internal_code).toMatch(/^TB-\d+-\d{3}$/);
    });
  });
});
