import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Contract,
  Customer,
  InitialInspection,
  Quotation,
  ServiceRequestItem,
  WorkOrder,
  WorkOrderAssignment,
} from '../database/entities.js';

const {
  findWorkOrdersMock,
  countWorkOrdersMock,
  findOneWorkOrderMock,
  saveWorkOrderMock,
  findContractsMock,
  findOneContractMock,
  findQuotationsMock,
  findOneQuotationMock,
  findCustomersMock,
  findOneCustomerMock,
  findOneInspectionMock,
  saveInspectionMock,
  getRepository,
} = vi.hoisted(() => ({
  findWorkOrdersMock: vi.fn(),
  countWorkOrdersMock: vi.fn(),
  findOneWorkOrderMock: vi.fn(),
  saveWorkOrderMock: vi.fn(),
  findContractsMock: vi.fn(),
  findOneContractMock: vi.fn(),
  findQuotationsMock: vi.fn(),
  findOneQuotationMock: vi.fn(),
  findCustomersMock: vi.fn(),
  findOneCustomerMock: vi.fn(),
  findOneInspectionMock: vi.fn(),
  saveInspectionMock: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales', id = 8) =>
  jwt.sign({ id, role }, env.jwt.secret, { expiresIn: '5m' });

describe('Work Orders Module API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRepository.mockImplementation((entity: unknown) => {
      if (entity === WorkOrder) {
        return {
          count: countWorkOrdersMock,
          find: findWorkOrdersMock,
          findOne: findOneWorkOrderMock,
          save: saveWorkOrderMock,
          create: vi.fn((data) => data),
        };
      }
      if (entity === Contract) {
        return {
          find: findContractsMock,
          findOne: findOneContractMock,
        };
      }
      if (entity === Quotation) {
        return {
          find: findQuotationsMock,
          findOne: findOneQuotationMock,
        };
      }
      if (entity === Customer) {
        return {
          find: findCustomersMock,
          findOne: findOneCustomerMock,
        };
      }
      if (entity === InitialInspection) {
        return {
          findOne: findOneInspectionMock,
          save: saveInspectionMock,
          create: vi.fn((data) => ({ id: 1, ...data })),
          find: vi.fn().mockResolvedValue([]),
          createQueryBuilder: vi.fn(() => ({
            leftJoinAndSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            getMany: vi.fn().mockResolvedValue([
              {
                id: 1,
                service_request_item_id: 3,
                result: 'Fail',
                defect_note: 'Bể mặt kính đồng hồ',
                customer_consent_status: 'Pending',
                inspected_at: new Date('2026-11-09T00:00:00Z'),
                service_request_item: {
                  service_request_id: 7,
                  service_request: { request_code: 'SR-2026-007' },
                  device: { id: 10, name: 'Đồng hồ đo áp suất' },
                  service_type: { name: 'Hiệu chuẩn áp suất', kind: 'Calibration' },
                },
              },
            ]),
          })),
        };
      }
      if (entity === ServiceRequestItem) {
        return {
          findOne: vi.fn().mockResolvedValue({ id: 3 }),
        };
      }
      if (entity === WorkOrderAssignment) {
        return {
          findOne: vi.fn().mockResolvedValue({
            id: 1,
            work_order_id: 1,
            service_request_item_id: 3,
            status: 'Assigned',
          }),
          save: vi.fn().mockResolvedValue({}),
          find: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(1),
        };
      }
      return {
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
      };
    });

    countWorkOrdersMock.mockResolvedValue(2);
    findWorkOrdersMock.mockResolvedValue([
      {
        id: 1,
        contract_id: 1,
        quotation_id: 7,
        status: 'Open',
        created_at: new Date('2026-11-01T08:00:00Z'),
      },
      {
        id: 2,
        contract_id: null,
        quotation_id: 4,
        status: 'InProgress',
        created_at: new Date('2026-11-02T09:00:00Z'),
      },
    ]);

    findContractsMock.mockResolvedValue([
      {
        id: 1,
        contract_code: 'HĐ-2026-001',
        title: 'Hợp đồng kiểm định thiết bị',
        status: 'Approved',
        customer_id: 1,
        total_amount: '1050000.00',
        sign_date: new Date('2026-11-01'),
        items: [],
      },
    ]);

    findQuotationsMock.mockResolvedValue([
      {
        id: 7,
        total_amount: '1000000.00',
        status: 'Approved',
        estimated_completion_date: '2026-11-15',
        service_request: {
          id: 3,
          request_code: 'SR-2026-003',
          customer_id: 1,
          location_type: 'In-lab',
          preferred_date: new Date('2026-11-10'),
          special_notes: 'Cần hiệu chuẩn gấp',
        },
        line_items: [
          {
            id: 1,
            unit_price: '1000000.00',
            discount_amount: '0.00',
            description: 'Hiệu chuẩn máy hiện sóng',
            service_request_item: {
              device: {
                id: 35,
                name: 'Máy hiện sóng',
                model: 'MSO-X 3024A',
                serial_number: 'MY500123',
                manufacturer: 'Keysight',
              },
              service_type: {
                name: 'Hiệu chuẩn máy hiện sóng',
                kind: 'Calibration',
                standard_code: 'CAL-OSC-01',
              },
            },
          },
        ],
      },
      {
        id: 4,
        total_amount: '9500000.00',
        status: 'Sent',
        estimated_completion_date: '2026-11-20',
        service_request: {
          id: 7,
          request_code: 'SR-2026-007',
          customer_id: 2,
          location_type: 'On-site',
          preferred_date: null,
          special_notes: null,
        },
        line_items: [],
      },
    ]);

    findCustomersMock.mockResolvedValue([
      {
        id: 1,
        company_name: 'Công ty Cổ phần Công nghệ Minh Đức',
        tax_code: '0102030405',
        address: 'Hà Nội',
        accounts: [{ phone: '0912345678' }],
      },
      {
        id: 2,
        company_name: 'Tập đoàn Điện lực Việt Nam',
        tax_code: '0304050607',
        address: 'Hồ Chí Minh',
        accounts: [],
      },
    ]);
  });

  describe('GET /api/v1/work-orders', () => {
    it('requires an authenticated account', async () => {
      const res = await request(app).get('/api/v1/work-orders');
      expect(res.status).toBe(401);
    });

    it('denies access to Customer role', async () => {
      const token = createToken('Customer', 10);
      const res = await request(app)
        .get('/api/v1/work-orders')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns the work order list with role-tailored information for Sales', async () => {
      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/work-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.summary).toEqual({
        total: 2,
        open: 1,
        assigned: 0,
        in_progress: 1,
        done: 0,
        cancelled: 0,
      });

      const firstItem = res.body.data.items[0];
      expect(firstItem.work_order_code).toBe('WO-2026-001');
      expect(firstItem.customer.name).toBe('Công ty Cổ phần Công nghệ Minh Đức');
      expect(firstItem.contract.code).toBe('HĐ-2026-001');
      expect(firstItem.sales_info).toBeDefined();
      expect(firstItem.sales_info.commercialStatus).toBeDefined();
      expect(firstItem.sales_info.revenue_amount).toBe(1050000);
    });

    it('returns the work order list with technical info for Reviewer (HeadTechnician)', async () => {
      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .get('/api/v1/work-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const firstItem = res.body.data.items[0];
      expect(firstItem.reviewer_info).toBeDefined();
      expect(firstItem.reviewer_info.needs_assignment).toBe(true);
      expect(firstItem.devices).toHaveLength(1);
      expect(firstItem.devices[0].name).toBe('Máy hiện sóng');
    });

    it('filters work orders by status', async () => {
      const token = createToken('Reviewer', 5);
      const res = await request(app)
        .get('/api/v1/work-orders?status=InProgress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].status).toBe('InProgress');
    });

    it('filters work orders by search text', async () => {
      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/work-orders?search=Minh Đức')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].customer.name).toContain('Minh Đức');
    });
  });

  describe('GET /api/v1/work-orders/:id', () => {
    it('returns 400 when id is invalid', async () => {
      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/work-orders/invalid-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('returns 404 when work order is not found', async () => {
      findOneWorkOrderMock.mockResolvedValue(null);
      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/work-orders/999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('returns full work order detail', async () => {
      findOneWorkOrderMock.mockResolvedValue({
        id: 1,
        contract_id: 1,
        quotation_id: 7,
        status: 'Open',
        created_at: new Date('2026-11-01T08:00:00Z'),
      });
      findOneContractMock.mockResolvedValue({
        id: 1,
        contract_code: 'HĐ-2026-001',
        title: 'Hợp đồng kiểm định',
        customer_id: 1,
        items: [],
      });
      findOneQuotationMock.mockResolvedValue({
        id: 7,
        line_items: [],
      });
      findOneCustomerMock.mockResolvedValue({
        id: 1,
        company_name: 'Công ty Cổ phần Công nghệ Minh Đức',
      });

      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/work-orders/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.work_order_code).toBe('WO-2026-001');
    });
  });

  describe('PATCH /api/v1/work-orders/:id/status', () => {
    it('returns 400 when status is invalid', async () => {
      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .patch('/api/v1/work-orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'InvalidStatus' });
      expect(res.status).toBe(400);
    });

    it('updates work order status successfully', async () => {
      const wo = {
        id: 1,
        contract_id: 1,
        quotation_id: 7,
        status: 'Open',
        created_at: new Date('2026-11-01T08:00:00Z'),
      };
      findOneWorkOrderMock.mockResolvedValue(wo);
      saveWorkOrderMock.mockResolvedValue({ ...wo, status: 'Assigned' });

      findOneContractMock.mockResolvedValue(null);
      findOneQuotationMock.mockResolvedValue(null);
      findOneCustomerMock.mockResolvedValue(null);

      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .patch('/api/v1/work-orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Assigned' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Technician Mobile / Offline API', () => {
    it('GET /api/v1/work-orders/technician/tasks returns tasks for technician', async () => {
      const token = createToken('Technician', 8);
      const res = await request(app)
        .get('/api/v1/work-orders/technician/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/work-orders/technician/sync syncs tasks from mobile offline queue', async () => {
      const token = createToken('Technician', 8);
      const res = await request(app)
        .post('/api/v1/work-orders/technician/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tasks: [
            {
              id: 'task-1',
              assignment_id: 1,
              submitted: true,
              signed: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.synced_count).toBeDefined();
    });

    it('POST /api/v1/work-orders/initial-inspections saves initial inspection result', async () => {
      findOneInspectionMock.mockResolvedValue(null);
      saveInspectionMock.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      const token = createToken('Technician', 8);
      const res = await request(app)
        .post('/api/v1/work-orders/initial-inspections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service_request_item_id: 3,
          result: 'Pass',
          defect_note: '',
          photo_url: '',
          customer_written_consent: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('Pass');
      expect(res.body.data.service_request_item_id).toBe(3);
    });

    it('POST /api/v1/work-orders/initial-inspections rejects Fail when defect note is empty', async () => {
      const token = createToken('Technician', 8);
      const res = await request(app)
        .post('/api/v1/work-orders/initial-inspections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service_request_item_id: 3,
          result: 'Fail',
          defect_note: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/work-orders/initial-inspections/:serviceRequestItemId returns inspection data', async () => {
      findOneInspectionMock.mockResolvedValue({
        id: 1,
        service_request_item_id: 3,
        result: 'Pass',
        defect_note: null,
        photo_url: null,
        customer_written_consent: false,
        inspected_by: 8,
        inspected_at: new Date('2026-11-09T00:00:00Z'),
      });

      const token = createToken('Technician', 8);
      const res = await request(app)
        .get('/api/v1/work-orders/initial-inspections/3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('Pass');
    });

    it('GET /api/v1/work-orders/initial-inspections/pending-consents returns pending inspection list', async () => {
      const token = createToken('Customer', 10);
      const res = await request(app)
        .get('/api/v1/work-orders/initial-inspections/pending-consents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].result).toBe('Fail');
    });

    it('POST /api/v1/work-orders/initial-inspections/consent records customer or technician consent decision', async () => {
      findOneInspectionMock.mockResolvedValue({
        id: 1,
        service_request_item_id: 3,
        result: 'Fail',
        defect_note: 'Bể mặt kính đồng hồ',
        customer_consent_status: 'Pending',
        customer_written_consent: false,
        inspected_by: 8,
        inspected_at: new Date('2026-11-09T00:00:00Z'),
      });

      const token = createToken('Technician', 8);
      const res = await request(app)
        .post('/api/v1/work-orders/initial-inspections/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service_request_item_id: 3,
          decision: 'Approved',
          note: 'Khách hàng đồng ý bằng văn bản tiếp tục hiệu chuẩn',
          signer_name: 'Trần Văn Khách',
          consent_method: 'WrittenDocument',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer_consent_status).toBe('Approved');
      expect(res.body.data.customer_written_consent).toBe(true);
    });

    it('POST /api/v1/work-orders/calibration-records saves technical procedure execution progress', async () => {
      const token = createToken('Technician', 8);
      const res = await request(app)
        .post('/api/v1/work-orders/calibration-records')
        .set('Authorization', `Bearer ${token}`)
        .send({
          service_request_item_id: 3,
          environment_temp: 23.5,
          environment_humidity: 48.0,
          steps: [{ step_no: 1, done: true, note: 'Đã sấy máy 30 phút' }],
          measurements: [{ test_point_id: 1, measured: '0.010', uncertainty: '0.00002' }],
          submit: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

