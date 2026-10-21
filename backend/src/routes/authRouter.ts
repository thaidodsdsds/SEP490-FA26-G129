import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dataSource from '../database/dataSource.js';
import { Account } from '../database/entities.js';
import { buildSuccessResponse, buildErrorResponse } from '../common/response.js';
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
 * Body: { full_name, email, password }
 * Creates a customer account (role_id = 7)
 */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body as {
      full_name?: string;
      email?: string;
      password?: string;
    };

    if (!full_name || !email || !password) {
      return res.status(400).json(buildErrorResponse('Full name, email, and password are required.', 'BAD_REQUEST'));
    }

    if (password.length < 6) {
      return res.status(400).json(buildErrorResponse('Password must be at least 6 characters.', 'BAD_REQUEST'));
    }

    const accountRepo = dataSource.getRepository(Account);
    const existing = await accountRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json(buildErrorResponse('An account with this email already exists.', 'CONFLICT'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = accountRepo.create({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role_id: 7, // Customer role
      customer_id: null,
      is_2fa_enabled: false,
      failed_login_attempts: 0,
    });

    await accountRepo.save(account);

    return res.status(201).json(
      buildSuccessResponse({
        message: 'Account created successfully.',
        account: {
          id: account.id,
          full_name: account.full_name,
          email: account.email,
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
 * In a real app this would send a reset email. Here it just acknowledges the request.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json(buildErrorResponse('Email is required.', 'BAD_REQUEST'));
    }

    // Always respond with success to avoid user enumeration
    return res.status(200).json(
      buildSuccessResponse({
        message: 'If that email exists in our system, a reset link has been sent.',
      }),
    );
  } catch (error) {
    console.error('[Auth] Forgot-password error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

export default router;
