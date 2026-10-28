import { Router } from 'express';
import bcrypt from 'bcryptjs';
import dataSource from '../database/dataSource.js';
import { Account, Role } from '../database/entities.js';
import { buildSuccessResponse, buildErrorResponse } from '../common/response.js';

const router = Router();

/* ─────────────────────────────────────────────────────────────────────
   ACCOUNTS
───────────────────────────────────────────────────────────────────── */

/**
 * GET /api/v1/admin/accounts
 * Query params: type (internal|customer), locked (true|false), search
 */
router.get('/accounts', async (req, res) => {
  try {
    const { type, locked, search } = req.query as Record<string, string>;

    const accountRepo = dataSource.getRepository(Account);
    let qb = accountRepo.createQueryBuilder('account')
      .leftJoinAndSelect('account.role', 'role')
      .leftJoinAndSelect('account.customer', 'customer')
      .orderBy('account.id', 'ASC');

    if (type === 'customer') {
      qb = qb.where('account.customer_id IS NOT NULL');
    } else if (type === 'internal') {
      qb = qb.where('account.customer_id IS NULL');
    }

    if (locked === 'true') {
      qb = qb.andWhere('account.failed_login_attempts >= :threshold', { threshold: 5 });
    } else if (locked === 'false') {
      qb = qb.andWhere('account.failed_login_attempts < :threshold', { threshold: 5 });
    }

    if (search) {
      qb = qb.andWhere(
        '(LOWER(account.full_name) LIKE :search OR LOWER(account.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const accounts = await qb.getMany();

    const result = accounts.map((acc) => ({
      id: acc.id,
      full_name: acc.full_name,
      email: acc.email,
      phone: acc.phone,
      role: acc.role ? { id: acc.role.id, name: acc.role.name } : null,
      role_id: acc.role_id,
      customer_id: acc.customer_id,
      customer_name: acc.customer?.company_name ?? null,
      is_2fa_enabled: acc.is_2fa_enabled,
      failed_login_attempts: acc.failed_login_attempts,
      is_locked: acc.failed_login_attempts >= 5,
    }));

    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    console.error('[Admin] List accounts error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/admin/accounts
 * Body: { full_name, email, password, phone?, role_id, is_2fa_enabled? }
 */
router.post('/accounts', async (req, res) => {
  try {
    const { full_name, email, password, phone, role_id, is_2fa_enabled } = req.body as {
      full_name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role_id?: number;
      is_2fa_enabled?: boolean;
    };

    if (!full_name || !email || !password || !role_id) {
      return res.status(400).json(buildErrorResponse('full_name, email, password, role_id are required.', 'BAD_REQUEST'));
    }

    const accountRepo = dataSource.getRepository(Account);
    const existing = await accountRepo.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json(buildErrorResponse('Email already in use.', 'CONFLICT'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const account = accountRepo.create({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      password_hash: passwordHash,
      role_id,
      is_2fa_enabled: is_2fa_enabled ?? false,
      failed_login_attempts: 0,
      customer_id: null,
    });

    await accountRepo.save(account);

    return res.status(201).json(buildSuccessResponse({ id: account.id, message: 'Account created.' }));
  } catch (error) {
    console.error('[Admin] Create account error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * PUT /api/v1/admin/accounts/:id
 * Body: { full_name?, phone?, role_id?, is_2fa_enabled?, password? }
 */
router.put('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, role_id, is_2fa_enabled, password } = req.body as {
      full_name?: string;
      phone?: string;
      role_id?: number;
      is_2fa_enabled?: boolean;
      password?: string;
    };

    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: Number(id) } });
    if (!account) {
      return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));
    }

    if (full_name !== undefined) account.full_name = full_name.trim();
    if (phone !== undefined) account.phone = phone?.trim() || null;
    if (role_id !== undefined) account.role_id = role_id;
    if (is_2fa_enabled !== undefined) account.is_2fa_enabled = is_2fa_enabled;
    if (password) account.password_hash = await bcrypt.hash(password, 10);

    await accountRepo.save(account);
    return res.status(200).json(buildSuccessResponse({ message: 'Account updated.' }));
  } catch (error) {
    console.error('[Admin] Update account error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/admin/accounts/:id/lock
 * Locks an account by setting failed_login_attempts to 5
 */
router.post('/accounts/:id/lock', async (req, res) => {
  try {
    const { id } = req.params;
    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: Number(id) } });
    if (!account) return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));

    account.failed_login_attempts = 5;
    await accountRepo.save(account);
    return res.status(200).json(buildSuccessResponse({ message: 'Account locked.' }));
  } catch (error) {
    console.error('[Admin] Lock account error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/admin/accounts/:id/unlock
 * Unlocks an account by resetting failed_login_attempts to 0
 */
router.post('/accounts/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    const accountRepo = dataSource.getRepository(Account);
    const account = await accountRepo.findOne({ where: { id: Number(id) } });
    if (!account) return res.status(404).json(buildErrorResponse('Account not found.', 'NOT_FOUND'));

    account.failed_login_attempts = 0;
    await accountRepo.save(account);
    return res.status(200).json(buildSuccessResponse({ message: 'Account unlocked.' }));
  } catch (error) {
    console.error('[Admin] Unlock account error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/* ─────────────────────────────────────────────────────────────────────
   ROLES
───────────────────────────────────────────────────────────────────── */

/**
 * GET /api/v1/admin/roles
 */
router.get('/roles', async (req, res) => {
  try {
    const roleRepo = dataSource.getRepository(Role);
    const roles = await roleRepo.find({ relations: ['accounts'] });

    const result = roles.map((r) => ({
      id: r.id,
      name: r.name,
      account_count: r.accounts?.length ?? 0,
    }));

    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    console.error('[Admin] List roles error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * POST /api/v1/admin/roles
 * Body: { name }
 */
router.post('/roles', async (req, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json(buildErrorResponse('Role name is required.', 'BAD_REQUEST'));

    const roleRepo = dataSource.getRepository(Role);
    const existing = await roleRepo.findOne({ where: { name: name.trim() } });
    if (existing) return res.status(409).json(buildErrorResponse('Role name already exists.', 'CONFLICT'));

    const role = roleRepo.create({ name: name.trim() });
    await roleRepo.save(role);

    return res.status(201).json(buildSuccessResponse({ id: role.id, message: 'Role created.' }));
  } catch (error) {
    console.error('[Admin] Create role error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

/**
 * PUT /api/v1/admin/roles/:id
 * Body: { name }
 */
router.put('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json(buildErrorResponse('Role name is required.', 'BAD_REQUEST'));

    const roleRepo = dataSource.getRepository(Role);
    const role = await roleRepo.findOne({ where: { id: Number(id) } });
    if (!role) return res.status(404).json(buildErrorResponse('Role not found.', 'NOT_FOUND'));

    role.name = name.trim();
    await roleRepo.save(role);

    return res.status(200).json(buildSuccessResponse({ message: 'Role updated.' }));
  } catch (error) {
    console.error('[Admin] Update role error:', error);
    return res.status(500).json(buildErrorResponse('Internal server error.', 'INTERNAL_ERROR'));
  }
});

export default router;
