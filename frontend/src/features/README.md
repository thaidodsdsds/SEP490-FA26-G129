# Frontend features

## Role dashboards

Three role overview pages live under `src/features/dashboards/`:

- `customer/` — `/internal/customer` (Customer, company-level overview)
- `accountant/` — `/internal/accountant` (Accountant, finance & receivables overview)
- `admin/` — `/internal/admin` (Admin, accounts, roles & system health overview)

All three use the shared responsive `RoleDashboardLayout` and display mock data.
Each dashboard page imports its own `mockData.js` so the mock layer can be swapped
for API calls later without rewriting the UI.

Shared presentational components live in `src/components/ui/`, and the styles for
the dashboards are in `src/styles/dashboard.css`.

## Customer creation flow (removed)

The old `/internal/customers` screen was removed because its form (name / email /
phone) did not match the ERD v5 `Customer` entity (company name, tax code,
address, industry). Customer management belongs to the Sales role and will be
rebuilt from the SRS screen list.
