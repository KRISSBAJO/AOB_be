# AOG Service Backend

NestJS API for the AOG Services platform.

## Stack

- NestJS
- Prisma
- PostgreSQL
- Swagger/OpenAPI

## Setup

```bash
npm install
copy .env.example .env
npm run db:up
npm run prisma:generate
npm run migrate:dev
npm run start:dev
```

API docs are available at `http://localhost:3101/docs`.

## Implemented Modules

- Auth, users, workspaces, roles, permissions, JWT guards, refresh tokens, and RBAC.
- Customers, contacts, facilities, facility contacts, service catalog, pricing, service areas, and contracts.
- Service requests, request items, approvals, work-order conversion, work orders, tasks, assignments, photos, and signoff.
- Departments, positions, employees, skills, certifications, shifts, attendance, and leave requests.

Most domain endpoints require:

- `Authorization: Bearer <accessToken>`
- `x-workspace-id: <workspaceId>`

Swagger docs are available at `http://localhost:3101/docs`.
