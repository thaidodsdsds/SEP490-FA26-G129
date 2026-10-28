import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Customer,
  Device,
  ServiceRequest,
  ServiceRequestItem,
  ServiceType,
} from '../database/entities.js';

const {
  findOneCustomer,
  findDevices,
  findServiceTypes,
  createServiceRequestMock,
  saveServiceRequestMock,
  createServiceRequestItemMock,
  saveServiceRequestItemMock,
  getRepository,
} = vi.hoisted(() => ({
  findOneCustomer: vi.fn(),
  findDevices: vi.fn(),
  findServiceTypes: vi.fn(),
  createServiceRequestMock: vi.fn(),
  saveServiceRequestMock: vi.fn(),
  createServiceRequestItemMock: vi.fn(),
  saveServiceRequestItemMock: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
    transaction: vi.fn(async (cb) => cb({ getRepository })),
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales', id = 8) => jwt.sign(
  { id, role },
  env.jwt.secret,
  { expiresIn: '5m' },
);

describe('Service Requests Module API', () => {
  beforeEach(() => {
    findOneCustomer.mockReset();
    findDevices.mockReset();
    findServiceTypes.mockReset();
    createServiceRequestMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveServiceRequestMock.mockReset();
    createServiceRequestItemMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveServiceRequestItemMock.mockReset();

    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Customer) {
        return { findOne: findOneCustomer };
      }
      if (entity === Device) {
        return { find: findDevices };
      }
      if (entity === ServiceType) {
        return { find: findServiceTypes };
      }
      if (entity === ServiceRequest) {
        return {
          create: createServiceRequestMock,
          save: saveServiceRequestMock,
        };
      }
      if (entity === ServiceRequestItem) {
        return {
          create: createServiceRequestItemMock,
          save: saveServiceRequestItemMock,
        };
      }
      return {};
    });
  });

  describe('POST /api/v1/service-requests', () => {
    it('requires an authenticated account', async () => {
      const response = await request(app)
        .post('/api/v1/service-requests')
        .send({});
      expect(response.status).toBe(401);
    });

    it('returns 400 when location_type is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 1,
          location_type: 'Remote',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid location_type. Allowed values: In-lab, On-site.',
        },
      });
    });

    it('returns 400 when duplicate (device_id, service_type_id) pairs are sent', async () => {
      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          items: [
            { device_id: 10, service_type_id: 1 },
            { device_id: 10, service_type_id: 1 },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Duplicate device and service type combination in request items.',
        },
      });
    });

    it('returns 404 when customer does not exist', async () => {
      findOneCustomer.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 999,
          location_type: 'In-lab',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Customer not found.',
        },
      });
    });

    it('returns 400 when a selected device does not belong to the customer', async () => {
      findOneCustomer.mockResolvedValue({ id: 1 });
      findDevices.mockResolvedValue([
        { id: 10, customer_id: 2, name: 'Đồng hồ vạn năng' },
      ]);

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All selected devices must belong to the specified customer.',
        },
      });
    });

    it('returns 400 when a selected service type has no Active procedure', async () => {
      findOneCustomer.mockResolvedValue({ id: 1 });
      findDevices.mockResolvedValue([
        { id: 10, customer_id: 1, name: 'Đồng hồ vạn năng' },
      ]);
      findServiceTypes.mockResolvedValue([
        {
          id: 1,
          name: 'Hiệu chuẩn cân bàn điện tử',
          kind: 'Calibration',
          field: 'KHOILUONG',
          standard_code: 'ĐLVN 15:2009',
          measuring_range: null,
          description: null,
          status: 'Active',
          calibration_procedures: [],
        },
      ]);

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dịch vụ "Hiệu chuẩn cân bàn điện tử" không hợp lệ: Chưa có quy trình kỹ thuật.',
        },
      });
    });

    it('creates a service request and its items when all validations pass', async () => {
      findOneCustomer.mockResolvedValue({ id: 1 });
      findDevices.mockResolvedValue([
        { id: 10, customer_id: 1, name: 'Đồng hồ vạn năng' },
      ]);
      findServiceTypes.mockResolvedValue([
        {
          id: 1,
          name: 'Hiệu chuẩn đồng hồ vạn năng',
          kind: 'Calibration',
          field: 'DIEN',
          standard_code: 'ĐLVN 142:2004',
          measuring_range: '0 - 1000V',
          description: null,
          status: 'Active',
          calibration_procedures: [{ id: 101, version: 'V1.0', status: 'Active' }],
        },
        {
          id: 2,
          name: 'Kiểm định đồng hồ vạn năng',
          kind: 'Verification',
          field: 'DIEN',
          standard_code: 'ĐLVN 143:2004',
          measuring_range: '0 - 1000V',
          description: null,
          status: 'Active',
          calibration_procedures: [{ id: 102, version: 'V1.1', status: 'Active' }],
        },
      ]);
      saveServiceRequestMock.mockImplementation(async (sr) => ({
        id: 100,
        created_at: new Date('2026-10-28T11:30:00.000Z'),
        ...sr,
      }));
      saveServiceRequestItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 500 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken('Sales', 8)}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          items: [
            {
              device_id: 10,
              service_type_ids: [1, 2],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 100,
        customer_id: 1,
        created_by: 8,
        location_type: 'In-lab',
        status: 'New',
        items: [
          {
            id: 500,
            service_request_id: 100,
            device_id: 10,
            service_type_id: 1,
            status: 'Pending',
          },
          {
            id: 501,
            service_request_id: 100,
            device_id: 10,
            service_type_id: 2,
            status: 'Pending',
          },
        ],
      });
    });
  });
});

