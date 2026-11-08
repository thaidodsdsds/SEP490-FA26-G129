import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { Customer, Device, DeviceOwnershipHistory } from '../database/entities.js';

const {
  getRepository,
  transaction,
  deviceFindOne,
  customerFindOne,
  historyFind,
  historyCreate,
  historySave,
} = vi.hoisted(() => ({
  getRepository: vi.fn(),
  transaction: vi.fn(),
  deviceFindOne: vi.fn(),
  customerFindOne: vi.fn(),
  historyFind: vi.fn(),
  historyCreate: vi.fn(),
  historySave: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
    transaction,
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales', id = 2, customer_id: number | null = null) =>
  jwt.sign(
    { id, email: `${role.toLowerCase()}@isocal.com`, role, customer_id },
    env.jwt.secret,
    { expiresIn: '5m' },
  );

describe('Device Ownership History & Transfer API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRepository.mockImplementation((entity: any) => {
      if (entity === Device) {
        return {
          findOne: deviceFindOne,
          save: vi.fn().mockImplementation(async (d: any) => ({ ...d })),
        };
      }
      if (entity === Customer) {
        return {
          findOne: customerFindOne,
        };
      }
      if (entity === DeviceOwnershipHistory) {
        return {
          find: historyFind,
          create: historyCreate.mockImplementation((h: any) => ({ ...h })),
          save: historySave.mockImplementation(async (h: any) => ({ id: 1, ...h })),
        };
      }
      return {};
    });

    transaction.mockImplementation(async (cb: any) => {
      const mockManager = {
        getRepository: (entity: any) => {
          if (entity === Device) {
            return {
              findOne: deviceFindOne,
              save: vi.fn().mockImplementation(async (d: any) => ({ ...d })),
            };
          }
          if (entity === DeviceOwnershipHistory) {
            return {
              create: historyCreate.mockImplementation((h: any) => ({ ...h })),
              save: historySave.mockImplementation(async (h: any) => ({ id: 10, ...h })),
            };
          }
          return {};
        },
        save: vi.fn().mockImplementation(async (d: any) => ({ ...d })),
      };
      return cb(mockManager);
    });
  });

  describe('GET /api/v1/devices/:id/ownership-history', () => {
    it('blocks Customer from viewing ownership history (internal only: Sales, Admin)', async () => {
      const token = createToken('Customer', 10, 1);
      const res = await request(app)
        .get('/api/v1/devices/1/ownership-history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Chỉ nhân viên nội bộ (Sales, Admin)');
    });

    it('allows Sales to view ownership history of a device', async () => {
      deviceFindOne.mockResolvedValue({
        id: 4,
        name: 'Ampe kìm Fluke',
        internal_code: 'TB-ABC-004',
        serial_number: 'FL-376-9022',
        customer_id: 1,
        customer: {
          id: 1,
          company_name: 'ABC Calibration Company',
          tax_code: '0312345678',
        },
      });

      historyFind.mockResolvedValue([
        {
          id: 1,
          device_id: 4,
          transferred_at: new Date('2026-09-22'),
          previous_customer: {
            id: 2,
            company_name: 'Vietnam Precision Engineering',
            tax_code: '0312345679',
          },
          new_customer: {
            id: 1,
            company_name: 'ABC Calibration Company',
            tax_code: '0312345678',
          },
          transferred_by_account: {
            id: 2,
            full_name: 'Nguyen Van An',
            email: 'sale@isocal.com',
          },
          transfer_reason: 'Chuyển giao quyền sở hữu theo hợp đồng sáp nhập',
          notes: 'Biên bản BB-BG-2026-081',
          status: 'Completed',
        },
      ]);

      const token = createToken('Sales', 2);
      const res = await request(app)
        .get('/api/v1/devices/4/ownership-history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.device_name).toBe('Ampe kìm Fluke');
      expect(res.body.data.current_owner.company_name).toBe('ABC Calibration Company');
      expect(res.body.data.histories).toHaveLength(1);
      expect(res.body.data.histories[0].previous_customer.company_name).toBe('Vietnam Precision Engineering');
    });

    it('returns 404 when device is not found', async () => {
      deviceFindOne.mockResolvedValue(null);

      const token = createToken('Admin', 1);
      const res = await request(app)
        .get('/api/v1/devices/999/ownership-history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Không tìm thấy thiết bị');
    });
  });

  describe('POST /api/v1/devices/:id/transfer-ownership', () => {
    it('blocks Customer from transferring ownership', async () => {
      const token = createToken('Customer', 10, 1);
      const res = await request(app)
        .post('/api/v1/devices/1/transfer-ownership')
        .set('Authorization', `Bearer ${token}`)
        .send({
          new_customer_id: 2,
          transfer_reason: 'Chuyển nhượng',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Chỉ nhân viên nội bộ (Sales, Admin)');
    });

    it('fails when new_customer_id is missing or same as current customer', async () => {
      deviceFindOne.mockResolvedValue({
        id: 1,
        customer_id: 1,
        name: 'Đồng hồ so',
      });
      customerFindOne.mockResolvedValue({
        id: 1,
        company_name: 'ABC Calibration',
      });

      const token = createToken('Sales', 2);
      const res = await request(app)
        .post('/api/v1/devices/1/transfer-ownership')
        .set('Authorization', `Bearer ${token}`)
        .send({
          new_customer_id: 1, // Same customer
          transfer_reason: 'Lý do',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Khách hàng tiếp nhận trùng với chủ sở hữu hiện tại');
    });

    it('fails when transfer_reason is missing or blank', async () => {
      const token = createToken('Sales', 2);
      const res = await request(app)
        .post('/api/v1/devices/1/transfer-ownership')
        .set('Authorization', `Bearer ${token}`)
        .send({
          new_customer_id: 2,
          transfer_reason: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Lý do chuyển quyền sở hữu là bắt buộc');
    });

    it('successfully transfers ownership when requested by Sales or Admin', async () => {
      deviceFindOne.mockResolvedValue({
        id: 1,
        customer_id: 1,
        name: 'Đồng hồ so điện tử',
        internal_code: 'TB-ABC-001',
        customer: { id: 1, company_name: 'ABC Calibration' },
      });

      customerFindOne.mockResolvedValue({
        id: 2,
        company_name: 'Vietnam Precision Engineering',
      });

      const token = createToken('Sales', 2);
      const res = await request(app)
        .post('/api/v1/devices/1/transfer-ownership')
        .set('Authorization', `Bearer ${token}`)
        .send({
          new_customer_id: 2,
          transfer_reason: 'Bàn giao thiết bị theo hợp đồng bán thanh lý máy móc đo lường',
          notes: 'Biên bản số HD-TL-2026-99',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Vietnam Precision Engineering thành công');
      expect(transaction).toHaveBeenCalled();
      expect(historyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 1,
          previous_customer_id: 1,
          new_customer_id: 2,
          transfer_reason: 'Bàn giao thiết bị theo hợp đồng bán thanh lý máy móc đo lường',
        }),
      );
    });
  });
});
