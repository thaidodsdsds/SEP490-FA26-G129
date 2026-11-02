import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { ServiceType } from '../database/entities.js';

const { findServiceTypes, findOneServiceType, getRepository } = vi.hoisted(() => ({
  findServiceTypes: vi.fn(),
  findOneServiceType: vi.fn(),
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

describe('Service Types Module API', () => {
  beforeEach(() => {
    findServiceTypes.mockReset();
    findOneServiceType.mockReset();
    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === ServiceType) {
        return {
          find: findServiceTypes,
          findOne: findOneServiceType,
        };
      }
      return { find: vi.fn(), findOne: vi.fn() };
    });
  });

  describe('GET /api/v1/service-types', () => {
    it('requires an authenticated account', async () => {
      const response = await request(app).get('/api/v1/service-types');
      expect(response.status).toBe(401);
    });

    it('returns service types with validation status and blocked_reason when inactive or missing active procedure', async () => {
      findServiceTypes.mockResolvedValue([
        {
          id: 1,
          name: 'Hiệu chuẩn đồng hồ vạn năng',
          kind: 'Calibration',
          field: 'DIEN',
          standard_code: 'ĐLVN 142:2004',
          measuring_range: '0 - 1000V',
          description: 'Hiệu chuẩn thiết bị đo điện',
          status: 'Active',
          calibration_procedures: [
            { id: 101, version: 'V1.0', status: 'Active' },
          ],
        },
        {
          id: 2,
          name: 'Hiệu chuẩn cân bàn điện tử',
          kind: 'Calibration',
          field: 'KHOILUONG',
          standard_code: 'ĐLVN 15:2009',
          measuring_range: '0 - 300kg',
          description: null,
          status: 'Active',
          calibration_procedures: [],
        },
        {
          id: 3,
          name: 'Kiểm định áp kế lò xo',
          kind: 'Verification',
          field: 'APSUAT',
          standard_code: 'ĐLVN 08:2011',
          measuring_range: '0 - 250 bar',
          description: null,
          status: 'Active',
          calibration_procedures: [
            { id: 102, version: 'V1.0', status: 'Draft' },
          ],
        },
        {
          id: 4,
          name: 'Hiệu chuẩn nhiệt ẩm kế',
          kind: 'Calibration',
          field: 'NHIET',
          standard_code: 'ĐLVN 138:2004',
          measuring_range: null,
          description: null,
          status: 'Inactive',
          calibration_procedures: [
            { id: 103, version: 'V1.0', status: 'Active' },
          ],
        },
      ]);

      const response = await request(app)
        .get('/api/v1/service-types')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([
        {
          id: 1,
          name: 'Hiệu chuẩn đồng hồ vạn năng',
          kind: 'Calibration',
          field: 'DIEN',
          standard_code: 'ĐLVN 142:2004',
          measuring_range: '0 - 1000V',
          description: 'Hiệu chuẩn thiết bị đo điện',
          status: 'Active',
          active_procedure: true,
          procedure_version: 'V1.0',
          is_valid: true,
          blocked_reason: null,
          errors: [],
        },
        {
          id: 2,
          name: 'Hiệu chuẩn cân bàn điện tử',
          kind: 'Calibration',
          field: 'KHOILUONG',
          standard_code: 'ĐLVN 15:2009',
          measuring_range: '0 - 300kg',
          description: null,
          status: 'Active',
          active_procedure: false,
          procedure_version: null,
          is_valid: false,
          blocked_reason: 'Chưa có quy trình kỹ thuật.',
          errors: ['Chưa có quy trình kỹ thuật.'],
        },
        {
          id: 3,
          name: 'Kiểm định áp kế lò xo',
          kind: 'Verification',
          field: 'APSUAT',
          standard_code: 'ĐLVN 08:2011',
          measuring_range: '0 - 250 bar',
          description: null,
          status: 'Active',
          active_procedure: false,
          procedure_version: null,
          is_valid: false,
          blocked_reason: 'Chưa có quy trình kỹ thuật Active.',
          errors: ['Chưa có quy trình kỹ thuật Active.'],
        },
        {
          id: 4,
          name: 'Hiệu chuẩn nhiệt ẩm kế',
          kind: 'Calibration',
          field: 'NHIET',
          standard_code: 'ĐLVN 138:2004',
          measuring_range: null,
          description: null,
          status: 'Inactive',
          active_procedure: true,
          procedure_version: 'V1.0',
          is_valid: false,
          blocked_reason: 'Dịch vụ hiện chưa Active.',
          errors: ['Dịch vụ hiện chưa Active.'],
        },
      ]);
    });
  });

  describe('GET /api/v1/service-types/:serviceTypeId/validate', () => {
    it('returns 400 when service type is not Active', async () => {
      findOneServiceType.mockResolvedValue({
        id: 4,
        name: 'Hiệu chuẩn nhiệt ẩm kế',
        kind: 'Calibration',
        field: 'NHIET',
        standard_code: 'ĐLVN 138:2004',
        measuring_range: null,
        description: null,
        status: 'Inactive',
        calibration_procedures: [{ id: 103, version: 'V1.0', status: 'Active' }],
      });

      const response = await request(app)
        .get('/api/v1/service-types/4/validate')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dịch vụ hiện chưa Active.',
        },
      });
    });

    it('returns 400 when service type has no procedure', async () => {
      findOneServiceType.mockResolvedValue({
        id: 2,
        name: 'Hiệu chuẩn cân bàn điện tử',
        kind: 'Calibration',
        field: 'KHOILUONG',
        standard_code: 'ĐLVN 15:2009',
        measuring_range: '0 - 300kg',
        description: null,
        status: 'Active',
        calibration_procedures: [],
      });

      const response = await request(app)
        .get('/api/v1/service-types/2/validate')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Chưa có quy trình kỹ thuật.',
        },
      });
    });

    it('returns 200 when service type is Active and has an Active procedure', async () => {
      findOneServiceType.mockResolvedValue({
        id: 1,
        name: 'Hiệu chuẩn đồng hồ vạn năng',
        kind: 'Calibration',
        field: 'DIEN',
        standard_code: 'ĐLVN 142:2004',
        measuring_range: '0 - 1000V',
        description: 'Hiệu chuẩn thiết bị đo điện',
        status: 'Active',
        calibration_procedures: [{ id: 101, version: 'V1.0', status: 'Active' }],
      });

      const response = await request(app)
        .get('/api/v1/service-types/1/validate')
        .set('Authorization', `Bearer ${createToken('Sales')}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: 1,
        is_valid: true,
        active_procedure: true,
        procedure_version: 'V1.0',
        blocked_reason: null,
      });
    });
  });
});
