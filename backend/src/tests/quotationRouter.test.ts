import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import {
  Quotation,
  QuotationLineItem,
  ServiceRequest,
  ServiceRequestItem,
} from '../database/entities.js';

const {
  findOneServiceRequestMock,
  saveServiceRequestMock,
  findServiceRequestItemsMock,
  findQuotationsMock,
  findOneQuotationMock,
  createQuotationMock,
  saveQuotationMock,
  createQuotationLineItemMock,
  saveQuotationLineItemMock,
  deleteQuotationLineItemMock,
  getRepository,
} = vi.hoisted(() => ({
  findOneServiceRequestMock: vi.fn(),
  saveServiceRequestMock: vi.fn(),
  findServiceRequestItemsMock: vi.fn(),
  findQuotationsMock: vi.fn(),
  findOneQuotationMock: vi.fn(),
  createQuotationMock: vi.fn(),
  saveQuotationMock: vi.fn(),
  createQuotationLineItemMock: vi.fn(),
  saveQuotationLineItemMock: vi.fn(),
  deleteQuotationLineItemMock: vi.fn(),
  getRepository: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
    transaction: vi.fn(async (cb) => cb({ getRepository })),
  },
}));

import app from '../app.js';

const createToken = (role = 'Sales', id = 8) =>
  jwt.sign({ id, role }, env.jwt.secret, { expiresIn: '5m' });

describe('Quotations Module API', () => {
  beforeEach(() => {
    findOneServiceRequestMock.mockReset();
    saveServiceRequestMock.mockReset().mockImplementation(async (sr) => sr);
    findServiceRequestItemsMock.mockReset();
    findQuotationsMock.mockReset().mockResolvedValue([]);
    findOneQuotationMock.mockReset();
    createQuotationMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveQuotationMock.mockReset();
    createQuotationLineItemMock.mockReset().mockImplementation((payload) => ({ ...payload }));
    saveQuotationLineItemMock.mockReset();
    deleteQuotationLineItemMock.mockReset().mockResolvedValue({ affected: 1 });

    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === ServiceRequest) {
        return {
          findOne: findOneServiceRequestMock,
          save: saveServiceRequestMock,
        };
      }
      if (entity === ServiceRequestItem) {
        return {
          find: findServiceRequestItemsMock,
        };
      }
      if (entity === Quotation) {
        return {
          find: findQuotationsMock,
          findOne: findOneQuotationMock,
          create: createQuotationMock,
          save: saveQuotationMock,
        };
      }
      if (entity === QuotationLineItem) {
        return {
          create: createQuotationLineItemMock,
          save: saveQuotationLineItemMock,
          delete: deleteQuotationLineItemMock,
        };
      }
      return {};
    });
  });

  describe('POST /api/v1/quotations', () => {
    it('requires an authenticated account', async () => {
      const response = await request(app).post('/api/v1/quotations').send({});
      expect(response.status).toBe(401);
    });

    it('returns 400 when status is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Approved',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid status. Allowed values: Draft, Sent.',
        },
      });
    });

    it('returns 400 when line item discount_amount exceeds unit_price', async () => {
      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Draft',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
              discount_amount: 1200000,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Line item discount_amount must be between 0 and unit_price.',
        },
      });
    });

    it('returns 404 when ServiceRequest does not exist', async () => {
      findOneServiceRequestMock.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 999,
          status: 'Draft',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
            },
          ],
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service request not found.',
        },
      });
    });

    it('returns 400 when total discount_amount exceeds subtotal', async () => {
      findOneServiceRequestMock.mockResolvedValue({ id: 88, status: 'New' });
      findServiceRequestItemsMock.mockResolvedValue([
        { id: 500, service_request_id: 88, status: 'Pending' },
      ]);

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Draft',
          discount_amount: 1500000,
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
              discount_amount: 100000,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Total discount_amount cannot exceed subtotal.',
        },
      });
    });

    it('creates a Draft quotation and keeps ServiceRequest status as New', async () => {
      findOneServiceRequestMock.mockResolvedValue({ id: 88, status: 'New' });
      findServiceRequestItemsMock.mockResolvedValue([
        { id: 500, service_request_id: 88, status: 'Pending' },
        { id: 501, service_request_id: 88, status: 'Pending' },
      ]);
      saveQuotationMock.mockImplementation(async (q) => ({
        id: 15,
        ...q,
      }));
      saveQuotationLineItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 900 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Draft',
          extra_discount: 50000,
          travel_fee: 300000,
          estimated_completion_date: '2026-11-05',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
              discount_amount: 100000,
            },
            {
              service_request_item_id: 501,
              description: 'Kiểm định cân điện tử',
              unit_price: 1500000,
              discount_amount: 50000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(saveServiceRequestMock).not.toHaveBeenCalled();
      expect(response.body.data).toMatchObject({
        id: 15,
        service_request_id: 88,
        service_request_status: 'New',
        subtotal: 2500000,
        discount_amount: 200000,
        travel_fee: 300000,
        total_amount: 2600000,
        estimated_completion_date: '2026-11-05',
        status: 'Draft',
      });
    });

    it('creates a Sent quotation and updates ServiceRequest status to Quoted', async () => {
      const srRecord = { id: 88, status: 'New' };
      findOneServiceRequestMock.mockResolvedValue(srRecord);
      findServiceRequestItemsMock.mockResolvedValue([
        { id: 500, service_request_id: 88, status: 'Pending' },
      ]);
      saveQuotationMock.mockImplementation(async (q) => ({
        id: 16,
        ...q,
      }));
      saveQuotationLineItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 910 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Sent',
          travel_fee: 0,
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
              discount_amount: 100000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(saveServiceRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 88, status: 'Quoted' }),
      );
      expect(response.body.data).toMatchObject({
        id: 16,
        service_request_id: 88,
        service_request_status: 'Quoted',
        subtotal: 1000000,
        discount_amount: 100000,
        travel_fee: 0,
        total_amount: 900000,
        status: 'Sent',
      });
    });

    it('returns 409 CONFLICT when ServiceRequest already has a Sent or Approved quotation', async () => {
      findOneServiceRequestMock.mockResolvedValue({ id: 88, status: 'Quoted' });
      findQuotationsMock.mockResolvedValue([
        { id: 16, service_request_id: 88, status: 'Sent' },
      ]);

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Sent',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng',
              unit_price: 1000000,
            },
          ],
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(saveQuotationMock).not.toHaveBeenCalled();
    });

    it('updates the existing Draft quotation in-place instead of creating a duplicate record', async () => {
      const srRecord = { id: 88, status: 'New' };
      const existingDraft = {
        id: 15,
        service_request_id: 88,
        subtotal: '1000000.00',
        discount_amount: '0.00',
        travel_fee: '0.00',
        total_amount: '1000000.00',
        status: 'Draft',
      };
      findOneServiceRequestMock.mockResolvedValue(srRecord);
      findQuotationsMock.mockResolvedValue([existingDraft]);
      findServiceRequestItemsMock.mockResolvedValue([
        { id: 500, service_request_id: 88, status: 'Pending' },
      ]);
      saveQuotationMock.mockImplementation(async (q) => q);
      saveQuotationLineItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 950 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Sent',
          travel_fee: 200000,
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng (cập nhật giá)',
              unit_price: 1200000,
              discount_amount: 100000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(createQuotationMock).not.toHaveBeenCalled();
      expect(deleteQuotationLineItemMock).toHaveBeenCalledWith({ quotation_id: 15 });
      expect(response.body.data).toMatchObject({
        id: 15,
        is_updated_draft: true,
        status: 'Sent',
        service_request_status: 'Quoted',
        subtotal: 1200000,
        discount_amount: 100000,
        travel_fee: 200000,
        total_amount: 1300000,
      });
    });

    it('allows creating a new quotation when the previous quotation was Rejected', async () => {
      findOneServiceRequestMock.mockResolvedValue({ id: 88, status: 'Quoted' });
      findQuotationsMock.mockResolvedValue([
        { id: 16, service_request_id: 88, status: 'Rejected' },
      ]);
      findServiceRequestItemsMock.mockResolvedValue([
        { id: 500, service_request_id: 88, status: 'Pending' },
      ]);
      saveQuotationMock.mockImplementation(async (q) => ({ id: 17, ...q }));
      saveQuotationLineItemMock.mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>, idx: number) => ({
          id: 960 + idx,
          ...item,
        })),
      );

      const response = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${createToken()}`)
        .send({
          service_request_id: 88,
          status: 'Sent',
          line_items: [
            {
              service_request_item_id: 500,
              description: 'Hiệu chuẩn đồng hồ vạn năng (giá thương lượng lần 2)',
              unit_price: 850000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        id: 17,
        status: 'Sent',
        total_amount: 850000,
      });
    });
  });

  describe('PATCH /api/v1/quotations/:quotationId/send', () => {
    it('returns 404 when quotation is not found', async () => {
      findOneQuotationMock.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/v1/quotations/999/send')
        .set('Authorization', `Bearer ${createToken()}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 when quotation is already Sent', async () => {
      findOneQuotationMock.mockResolvedValue({
        id: 15,
        service_request_id: 88,
        status: 'Sent',
        service_request: { id: 88, status: 'Quoted' },
        line_items: [],
      });

      const response = await request(app)
        .patch('/api/v1/quotations/15/send')
        .set('Authorization', `Bearer ${createToken()}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only quotations in "Draft" status can be sent. Current status: "Sent".',
        },
      });
    });

    it('transitions a Draft quotation to Sent and updates ServiceRequest status to Quoted', async () => {
      const draftQuotation = {
        id: 15,
        service_request_id: 88,
        subtotal: '2500000.00',
        discount_amount: '200000.00',
        travel_fee: '300000.00',
        total_amount: '2600000.00',
        estimated_completion_date: '2026-11-05',
        status: 'Draft',
        service_request: { id: 88, status: 'New' },
        line_items: [
          {
            id: 900,
            quotation_id: 15,
            service_request_item_id: 500,
            description: 'Hiệu chuẩn đồng hồ vạn năng',
            unit_price: '1000000.00',
            discount_amount: '100000.00',
          },
        ],
      };
      findOneQuotationMock.mockResolvedValue(draftQuotation);
      saveQuotationMock.mockImplementation(async (q) => q);

      const response = await request(app)
        .patch('/api/v1/quotations/15/send')
        .set('Authorization', `Bearer ${createToken()}`);

      expect(response.status).toBe(200);
      expect(saveServiceRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 88, status: 'Quoted' }),
      );
      expect(response.body.data).toMatchObject({
        id: 15,
        service_request_id: 88,
        service_request_status: 'Quoted',
        status: 'Sent',
        total_amount: 2600000,
      });
    });
  });
});

