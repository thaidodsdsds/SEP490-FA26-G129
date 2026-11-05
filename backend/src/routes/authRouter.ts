import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dataSource from '../database/dataSource.js';
import { Account, Customer, Role } from '../database/entities.js';
import { buildSuccessResponse, buildErrorResponse } from '../common/response.js';
import { sendPasswordResetEmail } from '../common/emailService.js';
import env from '../config/env.js';

const router = Router();

/**
 * POST /api/v1/auth/login
 * Body: { email: string, password: string }
 * Returns JWT token + account info (with role name)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json(buildErrorResponse('Email and password are required.', 'BAD_REQUEST'));
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: ['role', 'customer'],
    });

    if (!account) {
      return res.status(401).json(buildErrorResponse('Invalid email or password.', 'UNAUTHORIZED'));
    }

    const passwordMatch = await bcrypt.compare(password, account.password_hash);
    if (!passwordMatch) {
      return res.status(401).json(buildErrorResponse('Invalid email or password.', 'UNAUTHORIZED'));
    }

    const payload = {
      id: account.id,
      email: account.email,
      role: account.role?.name ?? '',
      customer_id: account.customer_id,
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    return res.status(200).json(
      buildSuccessResponse({
        token,
        account: {
          id: account.id,
          full_name: account.full_name,
          email: account.email,
          phone: account.phone,
          role: account.role?.name ?? '',
          customer_id: account.customer_id,
          customer: account.customer
            ? {
                id: account.customer.id,
                company_name: account.customer.company_name,
              }
            : null,
        },
      }),
    );
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/auth/register
 * Body: { full_name, email, password, phone?, company_name, address, industry, tax_code? }
 * Creates a customer row and a linked customer account.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone,
      company_name,
      address,
      industry,
      tax_code,
    } = req.body as {
      full_name?: string;
      email?: string;
      password?: string;
      phone?: string;
      company_name?: string;
      address?: string;
      industry?: string;
      tax_code?: string;
    };

    if (!full_name?.trim() || !email?.trim() || !password) {
      return res.status(400).json(buildErrorResponse('Full name, email, and password are required.', 'BAD_REQUEST'));
    }

    if (!company_name?.trim() || !address?.trim() || !industry?.trim()) {
      return res.status(400).json(
        buildErrorResponse('Company name, industry, and address are required.', 'BAD_REQUEST'),
      );
    }

    if (password.length < 6) {
      return res.status(400).json(buildErrorResponse('Password must be at least 6 characters.', 'BAD_REQUEST'));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const accountRepo = dataSource.getRepository(Account);
    const existing = await accountRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json(buildErrorResponse('An account with this email already exists.', 'CONFLICT'));
    }

    const customerRole = await dataSource.getRepository(Role).findOne({ where: { name: 'Customer' } });
    if (!customerRole) {
      return res.status(500).json(buildErrorResponse('Customer role is not configured.', 'INTERNAL_ERROR'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const trimmedPhone = phone?.trim() || null;
    const trimmedTaxCode = tax_code?.trim() || null;

    if (trimmedTaxCode) {
      const existingCustomer = await dataSource.getRepository(Customer).findOne({
        where: { tax_code: trimmedTaxCode },
      });
      if (existingCustomer) {
        return res.status(409).json(
          buildErrorResponse('This tax code is already registered to another company.', 'CONFLICT'),
        );
      }
    }

    const savedAccount = await dataSource.transaction(async (manager) => {
      const customer = manager.create(Customer, {
        company_name: company_name.trim(),
        tax_code: trimmedTaxCode,
        address: address.trim(),
        industry: industry.trim(),
      });
      const savedCustomer = await manager.save(customer);

      const account = manager.create(Account, {
        full_name: full_name.trim(),
        email: normalizedEmail,
        phone: trimmedPhone,
        password_hash: passwordHash,
        role_id: customerRole.id,
        customer_id: savedCustomer.id,
        is_2fa_enabled: false,
        failed_login_attempts: 0,
      });
      return manager.save(account);
    });

    return res.status(201).json(
      buildSuccessResponse({
        message: 'Account created successfully.',
        account: {
          id: savedAccount.id,
          full_name: savedAccount.full_name,
          email: savedAccount.email,
          phone: savedAccount.phone,
          customer_id: savedAccount.customer_id,
        },
      }),
    );
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Body: { email: string }
 * Sends a real password reset link to user's email if the account exists.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email || !email.trim()) {
      return res.status(400).json(buildErrorResponse('Email is required.', 'BAD_REQUEST'));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (account) {
      // Create a secure single-use reset token containing password_hash slice so it becomes invalid once password is reset
      const resetToken = jwt.sign(
        {
          id: account.id,
          email: account.email,
          type: 'password_reset',
          v: account.password_hash.slice(-10),
        },
        env.jwt.secret,
        { expiresIn: '15m' },
      );

      const resetUrl = `${env.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      try {
        await sendPasswordResetEmail({
          to: account.email,
          resetUrl,
          fullName: account.full_name,
        });
      } catch (mailError) {
        console.error('[Auth] Error sending reset email:', mailError);
        return res.status(500).json(
          buildErrorResponse(
            'Hệ thống không thể gửi email lúc này. Vui lòng kiểm tra lại cấu hình email máy chủ.',
            'MAIL_SEND_FAILED',
          ),
        );
      }
    }

    // Always respond with success to avoid user enumeration
    return res.status(200).json(
      buildSuccessResponse({
        message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.',
      }),
    );
  } catch (error) {
    console.error('[Auth] Forgot-password error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * GET /api/v1/auth/verify-reset-token?token=...
 * Verifies if the reset token is valid and not expired/already used.
 */
router.get('/verify-reset-token', async (req, res) => {
  try {
    const token = req.query.token as string | undefined;

    if (!token) {
      return res.status(400).json(buildErrorResponse('Mã xác thực là bắt buộc.', 'BAD_REQUEST'));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 'TOKEN_INVALID'),
      );
    }

    if (decoded?.type !== 'password_reset' || !decoded?.id || !decoded?.v) {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu không hợp lệ.', 'TOKEN_INVALID'),
      );
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: decoded.id } });

    if (!account || account.password_hash.slice(-10) !== decoded.v) {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu này đã được sử dụng hoặc không còn hiệu lực.', 'TOKEN_EXPIRED'),
      );
    }

    return res.status(200).json(
      buildSuccessResponse({
        valid: true,
        email: account.email,
      }),
    );
  } catch (error) {
    console.error('[Auth] Verify reset token error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Body: { token: string, password: string }
 * Resets user's password with the new password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password) {
      return res.status(400).json(buildErrorResponse('Token và mật khẩu mới là bắt buộc.', 'BAD_REQUEST'));
    }

    if (password.length < 6) {
      return res.status(400).json(buildErrorResponse('Mật khẩu mới phải có ít nhất 6 ký tự.', 'BAD_REQUEST'));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 'TOKEN_INVALID'),
      );
    }

    if (decoded?.type !== 'password_reset' || !decoded?.id || !decoded?.v) {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu không hợp lệ.', 'TOKEN_INVALID'),
      );
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: decoded.id } });

    if (!account || account.password_hash.slice(-10) !== decoded.v) {
      return res.status(400).json(
        buildErrorResponse('Liên kết đặt lại mật khẩu này đã được sử dụng hoặc không còn hiệu lực.', 'TOKEN_EXPIRED'),
      );
    }

    const newPasswordHash = await bcrypt.hash(password, 10);
    account.password_hash = newPasswordHash;
    account.failed_login_attempts = 0;
    await accountRepo.save(account);

    return res.status(200).json(
      buildSuccessResponse({
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
      }),
    );
  } catch (error) {
    console.error('[Auth] Reset-password error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

export default router;
