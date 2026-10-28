/**
 * Admin API service — accounts & roles management.
 * All endpoints require an authenticated admin session.
 */

const BASE = '/api/v1/admin';

/* ─── helper ─────────────────────────────────────────────────────── */
async function api(path, options = {}) {
  const token = localStorage.getItem('isocal_token');
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Lỗi server');
  return body.data;
}

/* ─── Accounts ────────────────────────────────────────────────────── */
export async function listAccounts({ type, locked, search } = {}) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (locked !== undefined && locked !== '') params.set('locked', locked);
  if (search) params.set('search', search);
  const qs = params.toString();
  return api(`/accounts${qs ? `?${qs}` : ''}`);
}

export async function createAccount(data) {
  return api('/accounts', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAccount(id, data) {
  return api(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function lockAccount(id) {
  return api(`/accounts/${id}/lock`, { method: 'POST' });
}

export async function unlockAccount(id) {
  return api(`/accounts/${id}/unlock`, { method: 'POST' });
}

/* ─── Roles ──────────────────────────────────────────────────────── */
export async function listRoles() {
  return api('/roles');
}

export async function createRole(data) {
  return api('/roles', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRole(id, data) {
  return api(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
