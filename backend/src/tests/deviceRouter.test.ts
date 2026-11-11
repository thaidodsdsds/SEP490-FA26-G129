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
import { Customer, Device, DeviceOwnershipHistory, ServiceRequestItem } from '../database/entities.js';

const {
  getRepository,
  deviceFindOne,
  deviceCreate,
  deviceSave,
  customerFindOne,
  sriFind,
} = vi.hoisted(() => ({
  getRepository: vi.fn(),
  deviceFindOne: vi.fn(),
  deviceCreate: vi.fn(),
  deviceSave: vi.fn(),
  customerFindOne: vi.fn(),
  sriFind: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales', customer_id: number | null = null) => jwt.sign(
  { id: 10, email: 'test@example.com', role, customer_id },
  env.jwt.secret,
  { expiresIn: '5m' },
);

describe('Devices Module API', () => {
  let mockQb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockQb = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 1,
            customer_id: 1,
            name: 'Đồng hồ so điện tử',
            model: 'ID-C112XB',
            manufacturer: 'Mitutoyo',
            serial_number: 'MT-IDC-1102',
            internal_code: 'TB-ABC-001',
            measuring_range: '0 - 12.7 mm',
            is_group2: true,
            next_due_date: '2026-11-20',
            status: 'ExpiringSoon',
            customer: {
              id: 1,
              company_name: 'ABC Calibration Company',
              tax_code: '0312345678',
            },
          },
        ],
        1,
      ]),
    };

    customerFindOne.mockResolvedValue({
      id: 1,
      company_name: 'ABC Calibration Company',
      tax_code: '0312345678',
    });

    sriFind.mockResolvedValue([]);

    getRepository.mockImplementation((entity: any) => {
      if (entity === Device) {
        return {
          createQueryBuilder: vi.fn().mockReturnValue(mockQb),
          findOne: deviceFindOne,
          create: deviceCreate.mockImplementation((d: any) => ({ ...d })),
          save: deviceSave.mockImplementation(async (d: any) => ({ id: 1, ...d })),
        };
      }
      if (entity === Customer) {
        return {
          findOne: customerFindOne,
        };
      }
      if (entity === ServiceRequestItem) {
        return {
          find: sriFind,
        };
      }
      if (entity === DeviceOwnershipHistory) {
        return {
          find: vi.fn().mockResolvedValue([]),
        };
      }
      return {};
    });
  });

  describe('GET /api/v1/devices', () => {
    it('requires authentication token', async () => {
      const res = await request(app).get('/api/v1/devices');
      expect(res.status).toBe(401);
    });

    it('allows Sales to list all devices and filter by customer_id, is_group2, due_status', async () => {
      const token = createToken('Sales');
      const res = await request(app)
        .get('/api/v1/devices?customer_id=1&is_group2=true&due_status=expiring_soon')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'device.customer_id = :customerId',
        { customerId: 1 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'device.is_group2 = :isGroup2',
        { isGroup2: true },
      );
    });

    it('forces customer_id for Customer role so they cannot see other customers devices', async () => {
      const token = createToken('Customer', 1);
      const res = await request(app)
        .get('/api/v1/devices?customer_id=999') // Customer tries to filter other customer
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'device.customer_id = :reqCustomerId',
        { reqCustomerId: 1 },
      );
      expect(mockQb.andWhere).not.toHaveBeenCalledWith(
        'device.customer_id = :customerId',
        { customerId: 999 },
      );
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    it('returns device detail with seal, calibration history, measurement results, and certificates', async () => {
      deviceFindOne.mockResolvedValue({
        id: 1,
        customer_id: 1,
        name: 'Đồng hồ so điện tử',
        model: 'ID-C112XB',
        manufacturer: 'Mitutoyo',
        serial_number: 'MT-IDC-1102',
        internal_code: 'TB-ABC-001',
        measuring_range: '0 - 12.7 mm',
        is_group2: true,
        next_due_date: '2026-11-20',
        status: 'ExpiringSoon',
        customer: {
          id: 1,
          company_name: 'ABC Calibration Company',
        },
      });

      const token = createToken('Sales');
      const res = await request(app)
        .get('/api/v1/devices/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.seal_history).toBeDefined();
      expect(res.body.data.calibration_history).toBeDefined();
      expect(res.body.data.measurement_results).toBeDefined();
      expect(res.body.data.certificates).toBeDefined();
    });

    it('blocks Customer from viewing a device belonging to another customer', async () => {
      deviceFindOne.mockResolvedValue({
        id: 7,
        customer_id: 2, // belongs to customer 2
        name: 'Panme đo ngoài',
      });

      const token = createToken('Customer', 1); // logged in as customer 1
      const res = await request(app)
        .get('/api/v1/devices/7')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Bạn không có quyền truy cập thiết bị của khách hàng khác');
    });
  });

  describe('POST /api/v1/devices', () => {
    it('auto-generates internal_code when serial_number or internal_code is omitted', async () => {
      deviceFindOne.mockResolvedValue(null);
      const token = createToken('Customer', 1);

      const res = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nhiệt ẩm kế không serial',
          model: 'Testo 625',
          manufacturer: 'Testo',
          measuring_range: '-10 to 60 C',
          is_group2: true,
        });

      expect(res.status).toBe(201);
      expect(deviceCreate).toHaveBeenCalled();
      const createArgs = deviceCreate.mock.calls[0][0];
      expect(createArgs.internal_code).toMatch(/^TB-/);
      expect(createArgs.customer_id).toBe(1);
    });

    it('fails if device name is missing', async () => {
      const token = createToken('Customer', 1);
      const res = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          model: 'ABC',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Tên thiết bị là bắt buộc');
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    it('blocks Sales from editing a device ("Sale thì có thể xem chi tiết, không được chỉnh sửa")', async () => {
      const token = createToken('Sales');
      const res = await request(app)
        .put('/api/v1/devices/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Tên mới do Sale sửa',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Kinh doanh (Sales) chỉ có quyền xem chi tiết');
    });

    it('blocks Customer from modifying another customers device', async () => {
      deviceFindOne.mockResolvedValue({
        id: 7,
        customer_id: 2,
        name: 'Panme',
      });

      const token = createToken('Customer', 1);
      const res = await request(app)
        .put('/api/v1/devices/7')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Thử sửa',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('Bạn không có quyền chỉnh sửa thiết bị của khách hàng khác');
    });

    it('allows Customer to update basic specs, and flags requires_verification if serial_number changes', async () => {
      deviceFindOne.mockImplementation((query: any) => {
        if (query?.where?.id === 1) {
          return {
            id: 1,
            customer_id: 1,
            name: 'Đồng hồ so',
            model: 'Old Model',
            serial_number: 'SN-OLD-01',
            status: 'Active',
            next_due_date: '2026-11-20',
          };
        }
        return null;
      });

      const token = createToken('Customer', 1);
      const res = await request(app)
        .put('/api/v1/devices/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Đồng hồ so mới',
          model: 'ID-C112XB-Updated',
          serial_number: 'SN-NEW-99',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.requires_verification).toBe(true);
      expect(res.body.data.verification_message).toContain('xác minh lại tính pháp lý');
    });
  });
});
