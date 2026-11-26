import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../database/dataSource.js', () => ({
  default: {
    query: vi.fn(async () => []),
  },
}));

import { getDashboardOverview } from '../modules/dashboard/dashboard.service.js';

describe('Dashboard overview service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ id: 1, role: 'Customer', customer_id: 1 }, ['customerKpis', 'dueDevices', 'notifications']],
    [{ id: 2, role: 'Admin' }, ['adminKpis', 'roleSummary', 'systemHealth']],
    [{ id: 3, role: 'Accountant' }, ['accountantKpis', 'revenueByMonth', 'contractDebts']],
    [{ id: 4, role: 'Sales' }, ['salesKpis', 'quotationFunnel', 'activeContracts']],
    [{ id: 5, role: 'Warehouse' }, ['warehouseKpis', 'weeklyThroughput', 'warehouseStatusDistribution']],
    [{ id: 6, role: 'HeadTechnician' }, ['reviewer']],
  ])('returns a usable payload for %j with an empty database', async (user, keys) => {
    const overview = await getDashboardOverview(user);

    for (const key of keys) {
      expect(overview).toHaveProperty(key);
    }
  });

  it('returns an empty payload for an unknown role', async () => {
    await expect(getDashboardOverview({ id: 9, role: 'Unknown' })).resolves.toEqual({});
  });
});
