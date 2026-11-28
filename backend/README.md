# ICS-DSVP---backend
Backend source code for the ICS-DSVP project, providing RESTful APIs, business logic, database management, and system integration to support the application.

## Database entities

Backend application code, tests, TypeORM entities, and migrations are written
in TypeScript. Source files are under `src/`; the PostgreSQL TypeORM decorator
classes for the 36 tables are maintained in `src/database/entities.ts`.
`npm run dev` runs the TypeScript entrypoint with `tsx`, `npm run build`
compiles to `dist/`, and `npm start` runs the compiled application. Schema
changes should be applied through migrations (`synchronize` is disabled).

## Apply database migrations

Configure the PostgreSQL connection in the backend environment, then run:

```powershell
npm run migration:run
```

The migrations create/update the documented schema and seed the eight standard
roles and eight calibration fields. Back up an existing database before running
them: upgrading the previous schema removes obsolete account/session and customer
contact columns, and fills missing customer address/industry values with empty
address and `Other` industry.

## Roles API

After starting the backend and applying the migrations, list the available roles
with:

```http
GET /api/v1/roles
```

The endpoint returns each role's `id`, `code`, and `name`, sorted by code. It
does not require authentication.

## Dashboard demo seed

After migrations, populate realistic data for every dashboard with:

```powershell
npm run seed
```

The seed is idempotent: it refreshes only deterministic demo rows with IDs
`101+` and leaves unrelated records untouched. Demo accounts use the password
`Isocal@123`. Useful logins include `admin.demo@isocal.com`,
`accountant2@isocal.com`, `sale2@isocal.com`, `head.sales@isocal.com`,
`warehouse.manager@isocal.com`, `reviewer@isocal.com`,
`technician2@isocal.com`, and `long@abc-calibration.com` (customer 1). The
original `admin@isocal.com`, `head.technician@isocal.com`, and
`ceo@isocal.com` accounts still require their configured 2FA flow.
