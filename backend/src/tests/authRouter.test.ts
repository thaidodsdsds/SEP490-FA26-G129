import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Account, Customer, Role } from '../database/entities.js';
import env from '../config/env.js';

const {
  findOneAccount,
  findOneRole,
  findOneCustomer,
  saveAccount,
  managerCreate,
  managerSave,
  getRepository,
  transaction,
  sendPasswordResetEmailMock,
  send2FAOTPEmailMock,
} = vi.hoisted(() => ({
  findOneAccount: vi.fn(),
  findOneRole: vi.fn(),
  findOneCustomer: vi.fn(),
  saveAccount: vi.fn(),
  managerCreate: vi.fn(),
  managerSave: vi.fn(),
  getRepository: vi.fn(),
  transaction: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  send2FAOTPEmailMock: vi.fn(),
}));

vi.mock('../database/dataSource.js', () => ({
  default: {
    getRepository,
    transaction,
  },
}));

vi.mock('../common/emailService.js', () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock,
  send2FAOTPEmail: send2FAOTPEmailMock,
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
    saveAccount.mockReset().mockResolvedValue({});
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
        return { findOne: findOneAccount, save: saveAccount };
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

describe('Forgot and Reset Password API', () => {
  const dummyPasswordHash = '$2a$10$abcdefghijklmnopqrstuvwxyz123456';

  beforeEach(() => {
    findOneAccount.mockReset();
    saveAccount.mockReset();
    sendPasswordResetEmailMock.mockReset().mockResolvedValue({ sent: true });
    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Account) {
        return { findOne: findOneAccount, save: saveAccount };
      }
      return {};
    });
  });

  it('returns 400 if email is missing on forgot-password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('sends reset email when account exists', async () => {
    findOneAccount.mockResolvedValue({
      id: 5,
      email: 'user@example.com',
      full_name: 'Nguyen User',
      password_hash: dummyPasswordHash,
    });

    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        fullName: 'Nguyen User',
        resetUrl: expect.stringContaining('/reset-password?token='),
      }),
    );
  });

  it('returns success even if account does not exist (prevents enumeration)', async () => {
    findOneAccount.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('verifies valid reset token successfully', async () => {
    const validToken = jwt.sign(
      {
        id: 5,
        email: 'user@example.com',
        type: 'password_reset',
        v: dummyPasswordHash.slice(-10),
      },
      env.jwt.secret,
      { expiresIn: '15m' },
    );

    findOneAccount.mockResolvedValue({
      id: 5,
      email: 'user@example.com',
      password_hash: dummyPasswordHash,
    });

    const response = await request(app)
      .get(`/api/v1/auth/verify-reset-token?token=${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.valid).toBe(true);
    expect(response.body.data.email).toBe('user@example.com');
  });

  it('rejects invalid or expired reset token on verify', async () => {
    const invalidToken = 'invalid.jwt.token';

    const response = await request(app)
      .get(`/api/v1/auth/verify-reset-token?token=${invalidToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });

  it('successfully resets password with valid token', async () => {
    const validToken = jwt.sign(
      {
        id: 5,
        email: 'user@example.com',
        type: 'password_reset',
        v: dummyPasswordHash.slice(-10),
      },
      env.jwt.secret,
      { expiresIn: '15m' },
    );

    const mockAccount = {
      id: 5,
      email: 'user@example.com',
      password_hash: dummyPasswordHash,
      failed_login_attempts: 3,
    };
    findOneAccount.mockResolvedValue(mockAccount);
    saveAccount.mockImplementation(async (acc) => acc);

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: validToken,
        password: 'newSecretPassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(saveAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        failed_login_attempts: 0,
      }),
    );
    const updatedAccount = saveAccount.mock.calls[0][0];
    const isNewPasswordValid = await bcrypt.compare('newSecretPassword123', updatedAccount.password_hash);
    expect(isNewPasswordValid).toBe(true);
  });

  it('rejects password reset if new password is too short', async () => {
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'some.token',
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('Two-Factor Authentication (2FA) API', () => {
  const passwordPlain = 'Admin@123';
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash(passwordPlain, 10);
    findOneAccount.mockReset();
    saveAccount.mockReset();
    send2FAOTPEmailMock.mockReset().mockResolvedValue({ sent: true });
    getRepository.mockReset().mockImplementation((entity) => {
      if (entity === Account) {
        return { findOne: findOneAccount, save: saveAccount };
      }
      return {};
    });
  });

  it('logs in directly when 2FA is disabled for account', async () => {
    findOneAccount.mockResolvedValue({
      id: 2,
      email: 'sale@isocal.com',
      full_name: 'Sales Staff',
      password_hash: passwordHash,
      is_2fa_enabled: false,
      role: { name: 'Sales' },
      customer_id: null,
      customer: null,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sale@isocal.com',
        password: passwordPlain,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.account.role).toBe('Sales');
    expect(send2FAOTPEmailMock).not.toHaveBeenCalled();
  });

  it('requires 2FA when is_2fa_enabled is true and sends OTP email', async () => {
    findOneAccount.mockResolvedValue({
      id: 1,
      email: 'admin@isocal.com',
      full_name: 'System Admin',
      password_hash: passwordHash,
      is_2fa_enabled: true,
      role: { name: 'Admin' },
      customer_id: null,
      customer: null,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@isocal.com',
        password: passwordPlain,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.require_2fa).toBe(true);
    expect(response.body.data.two_factor_token).toBeDefined();
    expect(response.body.data.email_masked).toBe('a***n@isocal.com');
    expect(response.body.data.token).toBeUndefined(); // no session token yet
    expect(send2FAOTPEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@isocal.com',
        otpCode: expect.stringMatching(/^\d{6}$/),
      }),
    );
  });

  it('verifies 2FA successfully with correct OTP and returns session token', async () => {
    const otpCode = '123456';
    const otpHash = await bcrypt.hash(otpCode, 8);
    const twoFactorToken = jwt.sign(
      { sub: 1, type: '2fa_pending', otp_hash: otpHash },
      env.jwt.secret,
      { expiresIn: '5m' },
    );

    findOneAccount.mockResolvedValue({
      id: 1,
      email: 'admin@isocal.com',
      full_name: 'System Admin',
      role: { name: 'Admin' },
      customer_id: null,
      customer: null,
    });

    const response = await request(app)
      .post('/api/v1/auth/verify-2fa')
      .send({
        two_factor_token: twoFactorToken,
        otp: '123456',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.account.email).toBe('admin@isocal.com');
    expect(response.body.data.account.role).toBe('Admin');
  });

  it('rejects 2FA verification with incorrect OTP', async () => {
    const otpCode = '123456';
    const otpHash = await bcrypt.hash(otpCode, 8);
    const twoFactorToken = jwt.sign(
      { sub: 1, type: '2fa_pending', otp_hash: otpHash },
      env.jwt.secret,
      { expiresIn: '5m' },
    );

    const response = await request(app)
      .post('/api/v1/auth/verify-2fa')
      .send({
        two_factor_token: twoFactorToken,
        otp: '999999',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_OTP');
  });

  it('rejects 2FA verification with expired or invalid token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/verify-2fa')
      .send({
        two_factor_token: 'invalid-token',
        otp: '123456',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('resends fresh 2FA OTP code and returns new token', async () => {
    const otpCode = '123456';
    const otpHash = await bcrypt.hash(otpCode, 8);
    const twoFactorToken = jwt.sign(
      { sub: 1, type: '2fa_pending', otp_hash: otpHash },
      env.jwt.secret,
      { expiresIn: '5m' },
    );

    findOneAccount.mockResolvedValue({
      id: 1,
      email: 'admin@isocal.com',
      full_name: 'System Admin',
    });

    const response = await request(app)
      .post('/api/v1/auth/resend-2fa')
      .send({
        two_factor_token: twoFactorToken,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.two_factor_token).toBeDefined();
    expect(send2FAOTPEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@isocal.com',
        otpCode: expect.stringMatching(/^\d{6}$/),
      }),
    );
  });
});
