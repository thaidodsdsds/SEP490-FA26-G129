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

const { queryMock, qrQueryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  qrQueryMock: vi.fn(),
}));

const mockQueryRunner = {
  connect: vi.fn().mockResolvedValue(undefined),
  startTransaction: vi.fn().mockResolvedValue(undefined),
  commitTransaction: vi.fn().mockResolvedValue(undefined),
  rollbackTransaction: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
  query: qrQueryMock,
};

vi.mock('../database/dataSource.js', () => ({
  default: {
    query: queryMock,
    createQueryRunner: vi.fn(() => mockQueryRunner),
  },
}));

import app from '../app.js';

const createToken = (role = 'Reviewer', id = 2) =>
  jwt.sign(
    { id, email: `${role.toLowerCase()}@isocal.com`, role },
    env.jwt.secret,
    { expiresIn: '5m' },
  );

describe('Calibration Records & Review Queue API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/calibration-records/review-queue', () => {
    it('requires authentication token', async () => {
      const response = await request(app).get('/api/v1/calibration-records/review-queue');
      expect(response.status).toBe(401);
    });

    it('returns review queue list for Reviewer', async () => {
      // Mock rows
      queryMock
        .mockResolvedValueOnce([
          {
            raw_id: 2,
            service_request_item_id: 8,
            procedure_id: 5,
            technician_id: 12,
            environment_temp: '23.5',
            environment_humidity: '48',
            result_status: 'Pass',
            review_status: 'Pending',
            submitted_at: new Date('2026-11-10T11:28:18.426Z'),
            device_id: 8,
            device_name: 'Cân phân tích',
            model: 'PX224',
            serial_number: 'OHAUS-BA-001',
            customer_name: 'ABC Calibration Company',
            technician_name: 'Nguyễn Minh Quân',
            service_type_name: 'Hiệu chuẩn cân phân tích',
            procedure_version: 'V2.0',
            environment_requirement: {
              temperature_c: { min: 18, max: 28 },
              humidity_percent: { min: 30, max: 75 },
            },
            work_order_code: 'WO-0004',
            standard_name: 'Bộ quả cân chuẩn F2',
            standard_serial: 'QC-F2-2024',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 10,
            calibration_record_id: 2,
            test_point_id: 129,
            repeat_no: 1,
            measured_value: '100.0004',
            reference_value: '100',
            deviation: '0.0004',
            uncertainty: '0.0001',
            pass_fail: true,
            point_no: 1,
            nominal_value: '100',
            tolerance: '0.0005',
            parameter_name: 'Kiểm tra độ lặp',
            parameter_unit: 'g',
          },
        ]);

      const token = createToken('Reviewer');
      const response = await request(app)
        .get('/api/v1/calibration-records/review-queue')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe('CR-2');
      expect(response.body.data[0].environmentStatus).toBe('Trong giới hạn');
      expect(response.body.data[0].measurements.length).toBe(1);
    });
  });

  describe('POST /api/v1/calibration-records/:id/review', () => {
    it('rejects with 400 when action is invalid', async () => {
      const token = createToken('Reviewer');
      const response = await request(app)
        .post('/api/v1/calibration-records/2/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'InvalidAction' });

      expect(response.status).toBe(400);
    });

    it('rejects with 400 when Reject action is missing reject_reason', async () => {
      const token = createToken('Reviewer');
      const response = await request(app)
        .post('/api/v1/calibration-records/2/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'Reject' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('reject_reason');
    });

    it('successfully approves a calibration record and creates ReviewLog', async () => {
      // 1. check existing
      queryMock.mockResolvedValueOnce([{ id: 2, service_request_item_id: 8, review_status: 'Pending' }]);

      // Queries inside transaction
      qrQueryMock
        // update calibration_records
        .mockResolvedValueOnce([])
        // insert review_logs
        .mockResolvedValueOnce([])
        // select reviewer account
        .mockResolvedValueOnce([{ full_name: 'Nguyễn Văn Duyệt' }])
        // insert digital_signatures
        .mockResolvedValueOnce([])
        // update service_request_items
        .mockResolvedValueOnce([])
        // update work_order_assignments
        .mockResolvedValueOnce([]);

      const token = createToken('Reviewer', 5);
      const response = await request(app)
        .post('/api/v1/calibration-records/2/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'Approve', comment: 'Số liệu đo chuẩn xác và đầy đủ' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review_status).toBe('Approved');
      expect(response.body.data.action).toBe('Approve');
    });

    it('successfully rejects a calibration record with reason and creates ReviewLog', async () => {
      // 1. check existing
      queryMock.mockResolvedValueOnce([{ id: 2, service_request_item_id: 8, review_status: 'Pending' }]);

      // Queries inside transaction
      qrQueryMock
        // update calibration_records
        .mockResolvedValueOnce([])
        // insert review_logs
        .mockResolvedValueOnce([])
        // update service_request_items
        .mockResolvedValueOnce([])
        // update work_order_assignments
        .mockResolvedValueOnce([]);

      const token = createToken('Reviewer', 5);
      const response = await request(app)
        .post('/api/v1/calibration-records/2/review')
        .set('Authorization', `Bearer ${token}`)
        .send({
          action: 'Reject',
          reject_reason: 'Sai lệch điểm 200g vượt dung sai cho phép',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review_status).toBe('Rejected');
      expect(response.body.data.reject_reason).toBe('Sai lệch điểm 200g vượt dung sai cho phép');
    });
  });
});

