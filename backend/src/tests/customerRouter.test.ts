import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Account,
  Customer,
  Device,
  Quotation,
  Role,
  ServiceRequest,
} from '../database/entities.js';

const {
  findCustomers,
  findOneCustomer,
  saveCustomer,
  createCustomerMock,
  findDevices,
  findOneDevice,
  createDevice,
  saveDevice,
  findAccounts,
  findOneAccount,
  findServiceRequests,
  getRepository,
  transaction,
} = vi.hoisted(() => ({
  findCustomers: vi.fn(),
  findOneCustomer: vi.fn(),
  saveCustomer: vi.fn(),
  createCustomerMock: vi.fn(),
  findDevices: vi.fn(),
  findOneDevice: vi.fn(),
  createDevice: vi.fn(),
  saveDevice: vi.fn(),
  findAccounts: vi.fn(),
  findOneAccount: vi.fn(),
  findServiceRequests: vi.fn(),
  getRepository: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
    transaction,
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
    saveCustomer.mockReset().mockImplementation(async (c) => ({ id: 1, ...c }));
    createCustomerMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    findDevices.mockReset();
    findOneDevice.mockReset();
    createDevice.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveDevice.mockReset();
    findAccounts.mockReset().mockResolvedValue([]);
    findOneAccount.mockReset().mockResolvedValue(null);
    findServiceRequests.mockReset().mockResolvedValue([]);
    transaction.mockReset().mockImplementation(async (cb) => cb({
      create: createCustomerMock,
      save: saveCustomer,
      findOne: vi.fn(),
    }));

    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Customer) {
        return {
          find: findCustomers,
          findOne: findOneCustomer,
          create: createCustomerMock,
          save: saveCustomer,
          createQueryBuilder: vi.fn().mockReturnValue({
            loadRelationCountAndMap: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            take: vi.fn().mockReturnThis(),
            getManyAndCount: vi.fn().mockResolvedValue([
              [
                {
                  id: 1,
                  company_name: 'ABC Corp',
                  tax_code: '0101',
                  address: 'Hanoi',
                  industry: 'Tech',
                  created_at: new Date(),
                  accounts_count: 2,
                  devices_count: 5,
                  service_requests_count: 3,
                },
              ],
              1,
            ]),
          }),
        };
      }
      if (entity === Device) {
        return {
          find: findDevices,
          findOne: findOneDevice,
          create: createDevice,
          save: saveDevice,
          createQueryBuilder: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      if (entity === Account) {
        return {
          find: findAccounts,
          findOne: findOneAccount,
          createQueryBuilder: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      if (entity === ServiceRequest) {
        return {
          find: findServiceRequests,
          createQueryBuilder: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      if (entity === Quotation) {
        return {
          createQueryBuilder: vi.fn().mockReturnValue({
            innerJoinAndSelect: vi.fn().mockReturnThis(),
            leftJoinAndSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            getMany: vi.fn().mockResolvedValue([]),
          }),
        };
      }
      return { find: vi.fn(), findOne: vi.fn() };
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

    it('returns detailed list with pagination when detailed=true is requested', async () => {
      const response = await request(app)
        .get('/api/v1/customers?detailed=true&page=1&limit=10')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body.data.customers).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
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

  describe('GET /api/v1/customers/:customerId', () => {
    it('returns 400 when customerId is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/customers/abc')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 404 when customer is not found', async () => {
      findOneCustomer.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/customers/999')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns customer details with accounts, devices, requests, and contracts', async () => {
      findOneCustomer.mockResolvedValue({
        id: 1,
        company_name: 'ABC Corp',
        tax_code: '0101',
        address: 'Hanoi',
        industry: 'Manufacturing',
      });
      findAccounts.mockResolvedValue([
        { id: 10, full_name: 'Contact A', email: 'a@abc.com', phone: '0901', role: { name: 'Customer' }, is_2fa_enabled: false, failed_login_attempts: 0 },
      ]);
      findDevices.mockResolvedValue([
        { id: 20, name: 'Multimeter', internal_code: 'TB-1' },
      ]);
      findServiceRequests.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/customers/1')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body.data.customer.company_name).toBe('ABC Corp');
      expect(response.body.data.accounts).toHaveLength(1);
      expect(response.body.data.devices).toHaveLength(1);
    });
  });

  describe('POST /api/v1/customers', () => {
    it('creates customer successfully', async () => {
      findOneCustomer.mockResolvedValue(null); // tax code check

      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({
          company_name: 'New Company',
          tax_code: '0123456789',
          address: '456 Street, Danang',
          industry: 'Electronics',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(transaction).toHaveBeenCalled();
    });

    it('rejects creation when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({
          company_name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('PUT /api/v1/customers/:customerId', () => {
    it('updates customer successfully', async () => {
      findOneCustomer.mockResolvedValue({
        id: 1,
        company_name: 'Old Name',
        tax_code: '0101',
        address: 'Old Address',
        industry: 'Old Industry',
      });

      const response = await request(app)
        .put('/api/v1/customers/1')
        .set('Authorization', `Bearer ${createToken('Sales')}`)
        .send({
          company_name: 'Updated Name',
          tax_code: '0101',
          address: 'New Address',
          industry: 'New Industry',
        });

      expect(response.status).toBe(200);
      expect(saveCustomer).toHaveBeenCalled();
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
          measuring_range: true,
          is_group2: true,
          next_due_date: true,
          status: true,
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
