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
