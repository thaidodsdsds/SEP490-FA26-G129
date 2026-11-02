import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dataSource from '../database/dataSource.js';
import { Account, Customer, Role } from '../database/entities.js';
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
