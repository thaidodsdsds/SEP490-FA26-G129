import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Account,
  Attachment,
  Customer,
  Device,
  ServiceRequest,
  ServiceRequestItem,
  ServiceType,
} from '../database/entities.js';

const {
  findOneAccountMock,
  findOneCustomer,
  findDevices,
  findServiceTypes,
  findServiceRequestsMock,
  createServiceRequestMock,
  saveServiceRequestMock,
  createServiceRequestItemMock,
  saveServiceRequestItemMock,
  createAttachmentMock,
  saveAttachmentMock,
  getRepository,
} = vi.hoisted(() => ({
  findOneAccountMock: vi.fn(),
  findOneCustomer: vi.fn(),
  findDevices: vi.fn(),
  findServiceTypes: vi.fn(),
  findServiceRequestsMock: vi.fn(),
  createServiceRequestMock: vi.fn(),
  saveServiceRequestMock: vi.fn(),
  createServiceRequestItemMock: vi.fn(),
  saveServiceRequestItemMock: vi.fn(),
  createAttachmentMock: vi.fn(),
  saveAttachmentMock: vi.fn(),
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
    findOneAccountMock.mockReset();
    findOneCustomer.mockReset();
    findDevices.mockReset();
    findServiceTypes.mockReset();
    findServiceRequestsMock.mockReset();
    createServiceRequestMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveServiceRequestMock.mockReset();
    createServiceRequestItemMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveServiceRequestItemMock.mockReset();
    createAttachmentMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveAttachmentMock.mockReset();

    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Account) {
        return { findOne: findOneAccountMock };
      }
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
          find: findServiceRequestsMock,
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
      if (entity === Attachment) {
        return {
          create: createAttachmentMock,
          save: saveAttachmentMock,
        };
      }
      return {};
    });
  });

  describe('GET /api/v1/service-requests', () => {
    it('requires an authenticated account', async () => {
      const response = await request(app).get('/api/v1/service-requests');
      expect(response.status).toBe(401);
    });

    it('returns the list of service requests with customer details', async () => {
      findServiceRequestsMock.mockResolvedValue([
        {
          id: 88,
          request_code: 'SR-2026-088',
          created_at: new Date('2026-10-28T11:30:00.000Z'),
          customer: {
            id: 1,
            company_name: 'ABC Calibration Company',
            tax_code: '0312345678',
            address: '123 Nguyen Trai, District 1, Ho Chi Minh City',
          },
        },
        {
          id: 12,
          request_code: null,
          created_at: new Date('2026-05-10T09:00:00.000Z'),
          customer: {
            id: 2,
            company_name: 'Viet Tech Lab',
            tax_code: '0109876543',
            address: '456 Le Loi, District 3, Ho Chi Minh City',
          },
        },
      ]);

      const response = await request(app)
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        meta: null,
        data: [
          {
            id: 88,
            request_code: 'SR-2026-088',
            customer: {
              id: 1,
              company_name: 'ABC Calibration Company',
              tax_code: '0312345678',
              address: '123 Nguyen Trai, District 1, Ho Chi Minh City',
            },
          },
          {
            id: 12,
            request_code: 'SR-2026-012',
            customer: {
              id: 2,
              company_name: 'Viet Tech Lab',
              tax_code: '0109876543',
              address: '456 Le Loi, District 3, Ho Chi Minh City',
            },
          },
        ],
      });
    });

    it('forwards internal errors to the global error handler', async () => {
      findServiceRequestsMock.mockRejectedValue(new Error('DB connection error'));

      const response = await request(app)
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`);

      expect(response.status).toBe(500);
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
        id: 88,
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
        id: 88,
        request_code: 'SR-2026-088',
        customer_id: 1,
        created_by: 8,
        location_type: 'In-lab',
        status: 'New',
        items: [
          {
            id: 500,
            service_request_id: 88,
            device_id: 10,
            service_type_id: 1,
            status: 'Pending',
          },
          {
            id: 501,
            service_request_id: 88,
            device_id: 10,
            service_type_id: 2,
            status: 'Pending',
          },
        ],
      });
    });

    it('resolves customer_id from Account and saves attachments when created by a Customer user', async () => {
      findOneAccountMock.mockResolvedValue({ id: 20, customer_id: 1 });
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
      ]);
      saveServiceRequestMock.mockImplementation(async (sr) => ({
        id: 89,
        created_at: new Date('2026-10-29T05:00:00.000Z'),
        ...sr,
      }));
      saveServiceRequestItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 600 + idx,
          ...item,
        })),
      );
      saveAttachmentMock.mockImplementation(async (atts) =>
        atts.map((att: Record<string, unknown>, idx: number) => ({
          id: 700 + idx,
          uploaded_at: new Date('2026-10-29T05:00:00.000Z'),
          ...att,
        })),
      );

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken('Customer', 20)}`)
        .send({
          location_type: 'On-site',
          items: [{ device_id: 10, service_type_id: 1 }],
          attachments: [
            {
              file_name: 'danh-muc-thiet-bi.pdf',
              file_url: 'client-upload://danh-muc-thiet-bi.pdf',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: 89,
        request_code: 'SR-2026-089',
        customer_id: 1,
        created_by: 20,
        location_type: 'On-site',
        status: 'New',
        attachments: [
          {
            id: 700,
            service_request_id: 89,
            file_name: 'danh-muc-thiet-bi.pdf',
            file_url: 'client-upload://danh-muc-thiet-bi.pdf',
          },
        ],
      });
    });

    it('returns 400 when preferred_date format is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          preferred_date: 'invalid-date',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid preferred_date format. Expected format: YYYY-MM-DD.',
        },
      });
    });

    it('saves preferred_date when a valid date is provided', async () => {
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
      ]);
      saveServiceRequestMock.mockImplementation(async (sr) => ({
        id: 90,
        created_at: new Date('2026-10-28T11:30:00.000Z'),
        ...sr,
      }));
      saveServiceRequestItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 600 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${createToken('Sales', 8)}`)
        .send({
          customer_id: 1,
          location_type: 'In-lab',
          preferred_date: '2026-11-05',
          items: [{ device_id: 10, service_type_id: 1 }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: 90,
        location_type: 'In-lab',
        preferred_date: '2026-11-05',
      });
    });
  });
});
