# React + Vite

## Role-based dashboard routing

After the authentication API succeeds, pass the returned account to the app session and navigate to the path it returns:

```jsx
const dashboardPath = startSession(account);
navigate(dashboardPath, { replace: true });
```

The account response must include its role name or code (`role: { name, code }`, `role_name`, or `role_code`). The role-to-dashboard mapping is centralized in `src/app/role-routing.js`:

- `Customer` or a non-null `customer_id` → `/customer`
- `Technician` → `/internal/technician`
- `Reviewer` / Head of Tech → `/internal/head-of-tech`
- Other supported internal roles → `/internal`

`startSession` is exposed by `useAppContext()` in `src/app/providers.jsx`; it validates the account role, stores the current in-memory session, and returns the correct dashboard path. Role dashboard routes redirect authenticated users to their own landing page if they open a different role's dashboard URL. The current operation screens remain available without a session for mock-data preview until authentication is implemented.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
