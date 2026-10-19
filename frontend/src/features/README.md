# Frontend features

## Customer creation flow

The customer screen is available at `/internal/customers`. The frontend currently
implements customer creation because the backend only exposes `POST /api/v1/customers`;
there is no customer-list endpoint yet.

When a user submits the form, these files work together:

1. `src/main.jsx` loads the global styles and mounts `src/App.jsx`.
2. `src/App.jsx` wraps the router in the shared `AppProviders` context.
3. `src/app/router.jsx` matches `/internal/customers` and renders
   `src/features/customers/CustomerManagementPage.jsx` inside the internal layout.
4. `src/layouts/InternalLayout.jsx` provides the navigation and page frame.
5. `CustomerManagementPage.jsx` owns form values, loading, success/error messages,
   and the list of customers created during this browser session.
6. `customers.api.js` sends the form data through the shared Axios client in
   `src/services/api-client.js`.
7. `api-client.js` sends `POST /customers` to `VITE_API_BASE_URL`, or defaults to
   `http://localhost:3000/api/v1`. The backend validates the request, creates the
   database record, and returns it in `response.data.data`.
8. The page displays that returned record. Since the backend does not yet provide
   a GET endpoint, this list is deliberately session-only and is not presented as
   a complete database listing.

`customers.css` contains styles scoped to the customer page. `src/styles/global.css`
contains the shared typography, navigation, and responsive page layout.
