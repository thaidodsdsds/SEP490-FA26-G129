import { Router } from 'express';
import bcrypt from 'bcryptjs';
import dataSource from '../database/dataSource.js';
import { Account } from '../database/entities.js';
import { buildSuccessResponse, buildErrorResponse } from '../common/response.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/profile
 * Returns the current authenticated user's profile.
 */
router.get('/', async (req, res) => {
  try {
    const userId = typeof req.user === 'object' && req.user !== null ? (req.user as any).id : null;
    if (!userId) {
      return res.status(401).json(buildErrorResponse('Unauthorized.', 'UNAUTHORIZED'));
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({
      where: { id: userId },
      relations: ['role', 'customer'],
    });

    if (!account) {
      return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));
    }

    return res.status(200).json(
      buildSuccessResponse({
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
              address: account.customer.address,
              industry: account.customer.industry,
              tax_code: account.customer.tax_code,
            }
          : null,
      }),
    );
  } catch (error) {
    console.error('[Profile] GET error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * PUT /api/v1/profile
 * Updates the current user's basic profile (full_name, phone).
 */
router.put('/', async (req, res) => {
  try {
    const userId = typeof req.user === 'object' && req.user !== null ? (req.user as any).id : null;
    if (!userId) {
      return res.status(401).json(buildErrorResponse('Unauthorized.', 'UNAUTHORIZED'));
    }

    const { full_name, phone } = req.body as { full_name?: string; phone?: string };

    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json(buildErrorResponse('Full name is required.', 'BAD_REQUEST'));
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: userId } });

    if (!account) {
      return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));
    }

    account.full_name = full_name.trim();
    account.phone = phone?.trim() || null;

    await accountRepo.save(account);

    return res.status(200).json(
      buildSuccessResponse({
        message: 'Profile updated successfully.',
        full_name: account.full_name,
        phone: account.phone,
      }),
    );
  } catch (error) {
    console.error('[Profile] PUT error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * PUT /api/v1/profile/change-password
 * Allows ONLY customers to change their password.
 */
router.put('/change-password', async (req, res) => {
  try {
    const userId = typeof req.user === 'object' && req.user !== null ? (req.user as any).id : null;
    const userRole = typeof req.user === 'object' && req.user !== null ? (req.user as any).role : null;

    if (!userId) {
      return res.status(401).json(buildErrorResponse('Unauthorized.', 'UNAUTHORIZED'));
    }

    // Only customers can change password via this endpoint
    const normalizedRole = String(userRole || '').toLowerCase();
    if (normalizedRole !== 'customer') {
      return res.status(403).json(
        buildErrorResponse(
          'Chỉ tài khoản khách hàng mới được đổi mật khẩu tại đây.',
          'FORBIDDEN',
        ),
      );
    }

    const { current_password, new_password } = req.body as {
      current_password?: string;
      new_password?: string;
    };

    if (!current_password || !new_password) {
      return res.status(400).json(
        buildErrorResponse('Current password and new password are required.', 'BAD_REQUEST'),
      );
    }

    if (new_password.length < 6) {
      return res.status(400).json(
        buildErrorResponse('New password must be at least 6 characters.', 'BAD_REQUEST'),
      );
    }

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: userId } });

    if (!account) {
      return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));
    }

    const passwordMatch = await bcrypt.compare(current_password, account.password_hash);
    if (!passwordMatch) {
      return res.status(400).json(buildErrorResponse('Mật khẩu hiện tại không đúng.', 'BAD_REQUEST'));
    }

    account.password_hash = await bcrypt.hash(new_password, 10);
    await accountRepo.save(account);

    return res.status(200).json(
      buildSuccessResponse({ message: 'Password changed successfully.' }),
    );
  } catch (error) {
    console.error('[Profile] change-password error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

export default router;
