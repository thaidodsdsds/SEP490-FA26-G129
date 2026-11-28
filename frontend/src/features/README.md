# Frontend features

## Role dashboards

Role overview pages live under `src/features/dashboards/`:

- `customer/` — `/internal/customer` (Customer, company-level overview)
- `accountant/` — `/internal/accountant` (Accountant, finance & receivables overview)
- `admin/` — `/internal/admin` (Admin, accounts, roles & system health overview)
- `sales/` — `/internal/sales` (Sales, assigned customers, quotations & contracts)
- `warehouse/` — `/internal/warehouse` (Warehouse, inbound/outbound & devices)

The Reviewer (Head of Tech) overview lives at
`src/features/reviewer/pages/dashboard/ReviewerDashboardPage.jsx`.
The Technician dashboard keeps using its own `GET /work-orders/technician/tasks` data source.

All pages above use the shared responsive `RoleDashboardLayout`. They no longer
import `mockData.js`; instead they call the authenticated
`GET /api/v1/dashboard/overview` endpoint via `src/services/dashboard-service.js`
and `src/hooks/useDashboardOverview.js`. The backend derives each role's payload
from the real database:
- Accounts/customers/roles for Admin.
- Devices, service requests, quotations, certificates and contracts for Customer.
- Contracts, quotations and certificates for Accountant/Sales (there are no
  invoice or payment tables in the schema).
- Warehouse transactions, devices and work orders for Warehouse.
- Work orders, seals, master standards and procedures for Reviewer.

`src/components/ui/DashboardFetchNotice.jsx` shows loading/error/retry state while
the overview is fetched. The Reviewer queue table still comes from
`GET /calibration-records/review-queue` in `ReviewerWorkspaceProvider.jsx`.

Shared presentational components live in `src/components/ui/`, and the styles for
the dashboards are in `src/styles/dashboard.css`. The `mockData.js` files under
the dashboard folders are now unused and can be removed once no other screens
reference them.

## Customer creation flow (removed)

The old `/internal/customers` screen was removed because its form (name / email /
phone) did not match the ERD v5 `Customer` entity (company name, tax code,
address, industry). Customer management belongs to the Sales role and will be
rebuilt from the SRS screen list.
