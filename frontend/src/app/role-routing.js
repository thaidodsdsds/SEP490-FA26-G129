const internalRoles = new Set([
  'admin',
  'accountant',
  'sales',
  'warehouse',
  'warehousestaff',
  'signatory',
  'ceo',
]);

const normalizeRole = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export function getAccountRole(account) {
  const role = account?.role;
  return typeof role === 'string'
    ? role
    : role?.name || role?.code || account?.role_name || account?.role_code || '';
}

/**
 * Returns true if the account belongs to the customer portal.
 * Customer = role 'customer' OR has a customer_id linked.
 */
export function isCustomerAccount(account) {
  if (!account) return false;
  const role = normalizeRole(getAccountRole(account));
  return role === 'customer' || account.customer_id != null;
}

/**
 * Returns true if the account belongs to the internal staff portal.
 * Staff = any non-customer role.
 */
export function isStaffAccount(account) {
  if (!account) return false;
  return !isCustomerAccount(account);
}

export function getRoleDashboardPath(account) {
  if (!account) return null;

  const role = normalizeRole(getAccountRole(account));
  if (role === 'customer' || account.customer_id != null) return '/internal/customer';
  if (role === 'admin' || role.includes('quantri')) return '/internal/admin';
  if (role === 'accountant' || role.includes('ketoan')) return '/internal/accountant';
  if (role === 'technician') return '/internal/technician';
  if (role === 'sales' || role.includes('kinhdoanh') || role.includes('sales')) return '/internal/sales';
  if (
    role === 'warehouse'
    || role === 'warehousestaff'
    || role.includes('kho')
    || role.includes('khovan')
  ) {
    return '/internal/warehouse';
  }
  if (
    role === 'reviewer'
    || role === 'headtechnician'
    || role.includes('labmanager')
    || role.includes('headoftech')
    || role.includes('technicalmanager')
  ) {
    return '/internal/head-of-tech';
  }
  if (internalRoles.has(role) || role === 'ceo' || role === 'sales') return '/internal';
  return null;
}

export function getRoleDisplayName(account, fallback = '') {
  const role = getAccountRole(account);
  return typeof role === 'string' ? role : fallback;
}

export function getUserInitials(account, fallback = '') {
  const name = account?.full_name || account?.name || '';
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('');
  return initials ? initials.toLocaleUpperCase('vi-VN') : fallback;
}
