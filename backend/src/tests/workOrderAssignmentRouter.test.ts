import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Account,
  MasterStandard,
  ServiceRequestItem,
  WorkOrder,
  WorkOrderAssignment,
} from '../database/entities.js';

const {
  findAccountsMock,
  findOneAccountMock,
  findMasterStandardsMock,
  findOneMasterStandardMock,
  findWorkOrdersMock,
  findOneWorkOrderMock,
  saveWorkOrderMock,
  findOneServiceRequestItemMock,
  findAssignmentsMock,
  findOneAssignmentMock,
  saveAssignmentMock,
  removeAssignmentMock,
  countAssignmentsMock,
  getRepository,
} = vi.hoisted(() => ({
  findAccountsMock: vi.fn(),
  findOneAccountMock: vi.fn(),
  findMasterStandardsMock: vi.fn(),
  findOneMasterStandardMock: vi.fn(),
  findWorkOrdersMock: vi.fn(),
  findOneWorkOrderMock: vi.fn(),
  saveWorkOrderMock: vi.fn(),
  findOneServiceRequestItemMock: vi.fn(),
  findAssignmentsMock: vi.fn(),
  findOneAssignmentMock: vi.fn(),
  saveAssignmentMock: vi.fn(),
  removeAssignmentMock: vi.fn(),
  countAssignmentsMock: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
  },
}));

import app from '../app.js';

const createToken = (role = 'HeadTechnician', id = 5) =>
  jwt.sign({ id, role }, env.jwt.secret, { expiresIn: '5m' });

describe('Work Order Assignments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRepository.mockImplementation((entity: unknown) => {
      if (entity === Account) {
        return {
          find: findAccountsMock,
          findOne: findOneAccountMock,
        };
      }
      if (entity === MasterStandard) {
        return {
          find: findMasterStandardsMock,
          findOne: findOneMasterStandardMock,
        };
      }
      if (entity === WorkOrder) {
        return {
          find: findWorkOrdersMock,
          findOne: findOneWorkOrderMock,
          save: saveWorkOrderMock,
        };
      }
      if (entity === ServiceRequestItem) {
        return {
          findOne: findOneServiceRequestItemMock,
        };
      }
      if (entity === WorkOrderAssignment) {
        return {
          find: findAssignmentsMock,
          findOne: findOneAssignmentMock,
          save: saveAssignmentMock,
          remove: removeAssignmentMock,
          count: countAssignmentsMock,
          create: vi.fn((data) => ({ id: 99, ...data })),
        };
      }
      return {
        find: vi.fn().mockResolvedValue([]),
        findOne: vi.fn().mockResolvedValue(null),
        save: vi.fn(),
      };
    });

    findAccountsMock.mockResolvedValue([
      {
        id: 4,
        full_name: 'Le Van Cuong',
        email: 'technician@isocal.com',
        phone: '0901000004',
        role: { name: 'Technician' },
      },
    ]);

    findMasterStandardsMock.mockResolvedValue([
      {
        id: 1,
        name: 'Calibrator Fluke 5522A',
        serial_number: 'FL-5522-8921',
        accuracy_class: '± 0.005 %',
        calibration_expiry: '2027-10-15',
        status: 'Active',
      },
      {
        id: 6,
        name: 'Thước vặn Mitutoyo',
        serial_number: 'MITU-025-781',
        accuracy_class: '± 0.001 mm',
        calibration_expiry: '2024-01-01',
        status: 'Expired',
      },
    ]);
  });

  describe('GET /api/v1/work-orders/assignments/resources', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/work-orders/assignments/resources');
      expect(res.status).toBe(401);
    });

    it('returns technicians and master standards with validity indicator', async () => {
      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .get('/api/v1/work-orders/assignments/resources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.technicians).toHaveLength(1);
      expect(res.body.data.technicians[0].full_name).toBe('Le Van Cuong');
      expect(res.body.data.master_standards).toHaveLength(2);

      const fluke = res.body.data.master_standards.find((s: any) => s.id === 1);
      expect(fluke.is_valid).toBe(true);

      const mitu = res.body.data.master_standards.find((s: any) => s.id === 6);
      expect(mitu.is_valid).toBe(false);
    });
  });

  describe('POST /api/v1/work-orders/assignments', () => {
    it('rejects when schedule end is before or equal to start', async () => {
      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .post('/api/v1/work-orders/assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          work_order_id: 1,
          service_request_item_id: 3,
          technician_id: 4,
          master_standard_id: 1,
          scheduled_start: '2026-11-10T10:00:00Z',
          scheduled_end: '2026-11-10T09:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Thời gian kết thúc phải sau thời gian bắt đầu');
    });

    it('rejects when master standard is expired', async () => {
      findOneWorkOrderMock.mockResolvedValue({ id: 1, status: 'Open' });
      findOneServiceRequestItemMock.mockResolvedValue({ id: 3 });
      findOneAccountMock.mockResolvedValue({ id: 4, full_name: 'Le Van Cuong' });
      findOneMasterStandardMock.mockResolvedValue({
        id: 6,
        name: 'Thước vặn Mitutoyo',
        serial_number: 'MITU-025-781',
        accuracy_class: '± 0.001 mm',
        calibration_expiry: '2024-01-01',
        status: 'Expired',
      });

      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .post('/api/v1/work-orders/assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          work_order_id: 1,
          service_request_item_id: 3,
          technician_id: 4,
          master_standard_id: 6,
          scheduled_start: '2026-11-10T08:00:00Z',
          scheduled_end: '2026-11-10T11:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('đã hết hạn hiệu chuẩn');
    });

    it('assigns technician and valid master standard successfully and updates work order to Assigned', async () => {
      const wo = { id: 1, status: 'Open' };
      findOneWorkOrderMock.mockResolvedValue(wo);
      findOneServiceRequestItemMock.mockResolvedValue({ id: 3 });
      findOneAccountMock.mockResolvedValue({
        id: 4,
        full_name: 'Le Van Cuong',
        email: 'technician@isocal.com',
        phone: '0901000004',
      });
      findOneMasterStandardMock.mockResolvedValue({
        id: 1,
        name: 'Calibrator Fluke 5522A',
        serial_number: 'FL-5522-8921',
        accuracy_class: '± 0.005 %',
        calibration_expiry: '2027-10-15',
        status: 'Active',
      });
      findOneAssignmentMock.mockResolvedValue(null);
      saveAssignmentMock.mockImplementation(async (entity) => entity);

      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .post('/api/v1/work-orders/assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          work_order_id: 1,
          service_request_item_id: 3,
          technician_id: 4,
          master_standard_id: 1,
          scheduled_start: '2026-11-10T08:00:00Z',
          scheduled_end: '2026-11-10T11:00:00Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.technician.name).toBe('Le Van Cuong');
      expect(res.body.data.master_standard.name).toBe('Calibrator Fluke 5522A');
      expect(res.body.data.master_standard.is_valid).toBe(true);
      expect(saveWorkOrderMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'Assigned' }));
    });
  });

  describe('DELETE /api/v1/work-orders/assignments/:id', () => {
    it('returns 404 when assignment is not found', async () => {
      findOneAssignmentMock.mockResolvedValue(null);
      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .delete('/api/v1/work-orders/assignments/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('deletes assignment successfully and resets work order to Open if no remaining assignments', async () => {
      findOneAssignmentMock.mockResolvedValue({
        id: 10,
        work_order_id: 1,
      });
      countAssignmentsMock.mockResolvedValue(0);
      findOneWorkOrderMock.mockResolvedValue({ id: 1, status: 'Assigned' });

      const token = createToken('HeadTechnician', 5);
      const res = await request(app)
        .delete('/api/v1/work-orders/assignments/10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(removeAssignmentMock).toHaveBeenCalled();
      expect(saveWorkOrderMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'Open' }));
    });
  });
});

