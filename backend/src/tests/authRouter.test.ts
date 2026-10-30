import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Account, Customer, Role } from '../database/entities.js';

const {
  findOneAccount,
  findOneRole,
  findOneCustomer,
  managerCreate,
  managerSave,
  getRepository,
  transaction,
} = vi.hoisted(() => ({
  findOneAccount: vi.fn(),
  findOneRole: vi.fn(),
  findOneCustomer: vi.fn(),
  managerCreate: vi.fn(),
  managerSave: vi.fn(),
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

const validPayload = {
  full_name: 'Nguyen Van Test',
  email: 'test.customer@example.com',
  password: 'secret12',
  phone: '0912345678',
  company_name: 'Test Calibration Co.',
  tax_code: '0311111111',
  industry: 'Manufacturing',
  address: '1 Nguyen Hue, District 1, HCMC',
};

describe('Auth register API', () => {
  beforeEach(() => {
    findOneAccount.mockReset().mockResolvedValue(null);
    findOneRole.mockReset().mockResolvedValue({ id: 7, name: 'Customer' });
    findOneCustomer.mockReset().mockResolvedValue(null);
    managerCreate.mockReset().mockImplementation((_entity, payload) => ({ ...payload }));
    managerSave.mockReset().mockImplementation(async (entity) => {
      if ('company_name' in entity) {
        return { id: 11, ...entity };
      }
      return { id: 20, ...entity };
    });
    transaction.mockReset().mockImplementation(async (cb) => cb({
      create: managerCreate,
      save: managerSave,
    }));
    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Account) {
        return { findOne: findOneAccount };
      }
      if (entity === Role) {
        return { findOne: findOneRole };
      }
      if (entity === Customer) {
        return { findOne: findOneCustomer };
      }
      return {};
    });
  });

  it('rejects registration when company fields are missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        full_name: 'Nguyen Van Test',
        email: 'test.customer@example.com',
        password: 'secret12',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate emails', async () => {
    findOneAccount.mockResolvedValue({ id: 1, email: validPayload.email });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('creates a customer row and a linked customer account', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        message: 'Account created successfully.',
        account: {
          id: 20,
          full_name: validPayload.full_name,
          email: validPayload.email,
          phone: validPayload.phone,
          customer_id: 11,
        },
      },
    });

    expect(findOneRole).toHaveBeenCalledWith({ where: { name: 'Customer' } });
    expect(managerCreate).toHaveBeenCalledWith(Customer, {
      company_name: validPayload.company_name,
      tax_code: validPayload.tax_code,
      address: validPayload.address,
      industry: validPayload.industry,
    });
    expect(managerCreate).toHaveBeenCalledWith(
      Account,
      expect.objectContaining({
        full_name: validPayload.full_name,
        email: validPayload.email,
        phone: validPayload.phone,
        role_id: 7,
        customer_id: 11,
        is_2fa_enabled: false,
        failed_login_attempts: 0,
      }),
    );
  });

  it('rejects a tax code already used by another company', async () => {
    findOneCustomer.mockResolvedValue({ id: 3, tax_code: validPayload.tax_code });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validPayload);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('stores empty tax_code and phone as null', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...validPayload,
        phone: '   ',
        tax_code: '',
      });

    expect(response.status).toBe(201);
    expect(managerCreate).toHaveBeenCalledWith(Customer, expect.objectContaining({
      tax_code: null,
    }));
    expect(managerCreate).toHaveBeenCalledWith(
      Account,
      expect.objectContaining({
        phone: null,
        customer_id: 11,
      }),
    );
  });
});
