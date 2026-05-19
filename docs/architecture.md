# Architecture

A reference for engineers working on or taking over the system. For
operational tasks (deploy, rollback, secrets, incidents) see
[`runbook.md`](runbook.md). For the threat model and security decisions
see [`../SECURITY.md`](../SECURITY.md).

## High-level diagram

```
                          Internet
                             │
                             ▼
                  ┌────────────────────────┐
                  │  Fly.io edge / proxy   │  TLS termination,
                  │  force_https = true    │  *.fly.dev cert
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │  Fly Machine — `app`   │  Next.js 15 (standalone)
                  │  shared-cpu-1, 1 GB    │  serves dashboard + API
                  │  auto start/stop,      │  health: GET /api/health
                  │  min_machines = 0      │
                  └───────────┬────────────┘
                              │ Prisma (pg driver)
                              ▼
                  ┌────────────────────────┐
                  │  Fly Postgres cluster  │  PostgreSQL 17
                  │  (attached app)        │  app data, single node v1
                  └────────────────────────┘
```

The entire product is **one Next.js process**. There is no separate API
service, no background worker, no queue, no cache. The dashboard UI, the
NextAuth endpoints, and the public pricing API are all routes inside the
same app.

## Runtime

### `app` (Fly Machine)
- One Docker image built from [`../Dockerfile`](../Dockerfile) — a
  multi-stage build producing Next.js `standalone` output run as
  `node server.js`.
- Listens on port 3000; Fly's proxy fronts it with TLS.
- `auto_stop_machines = 'stop'` / `auto_start_machines = true` /
  `min_machines_running = 0`: the machine stops when idle and starts on
  the next request. First request after idle pays a cold-start.
- Health check: `GET /api/health` every 30s (config in
  [`../fly.toml`](../fly.toml)).

### Database
- PostgreSQL 17, provisioned as a Fly Postgres cluster and attached to
  the app (which sets `DATABASE_URL`).
- Accessed through Prisma 7 with the `pg` driver adapter
  (`src/lib/db/client.ts`) — a single pooled client reused across
  requests via a global singleton.
- Migrations run as the Fly **release command**
  (`npx prisma migrate deploy`) before each new version takes traffic.

## Data model

Defined in [`../prisma/schema.prisma`](../prisma/schema.prisma).

| Table | Purpose | Key facts |
|---|---|---|
| `organizations` | Tenants (labs). | Holds the pricing parameters (discount factor, floor multiplier, overhead, donation, revenue share) and the hashed API key. |
| `users` | Login accounts. | `role` ∈ {`super_admin`, `lab_manager`, `lab_employee`}; `org_id` links to a tenant (null for super-admins). bcrypt `password_hash`. |
| `lab_tests` | A tenant's test catalogue. | `(test_id, org_id)` unique — `test_id` is the lab's own identifier. |
| `panels` | Named bundles of tests. | Belongs to one org. |
| `panel_tests` | Join table panel ↔ test. | `(panel_id, test_id)` unique. |
| `pricing_logs` | Audit trail of every price calculation. | `source` ∈ {`calculator`, `api`}; stores the test ids/names and final price. |

`organizations` and `users` also carry `archived_at` — archiving is a
soft delete that blocks login (see auth, below).

## Multi-tenancy

Tenant isolation is enforced **in application code**: every query and
server action in `src/lib/db/` filters by the `orgId` resolved from the
server-side session.

PostgreSQL Row-Level Security policies also exist (migration
`20260306120001_rls_policies`) but are **currently inert** — the app
does not set the `app.current_org_id` session variable they depend on,
and connects as the DB owner (RLS-exempt). See
[`../SECURITY.md`](../SECURITY.md) → "Tenant isolation" for the full
explanation and the recommended fix. Treat the in-code `orgId` filter as
the real control until RLS is wired up.

## Authentication & authorization

- **NextAuth v5** (Auth.js), Credentials provider, JWT session strategy.
  Config split between `src/lib/auth/auth.config.ts` (edge-safe, no DB)
  and `src/lib/auth/config.ts` (full config with the Prisma user
  lookup).
- Login: email + password, verified with `bcryptjs`.
- The JWT carries `userId`, `role`, `orgId`, `orgName`. Every ~60s the
  session callback re-checks the user's and org's `archived_at` so a
  disabled account is locked out without waiting for token expiry.
- **`src/middleware.ts`** protects `/dashboard/*`: unauthenticated users
  are sent to the login page, and each role is restricted to its allowed
  pages (super-admin → admin; manager → tests/panels/calculator/logs/
  analytics; employee → calculator only).
- **API auth** is separate: `/api/v1/pricing` uses a Bearer API key, not
  a session — see `src/lib/auth/api-key.ts`.

## Code map

### Pages — `src/app/dashboard/`
Each page is a server component (`page.tsx`) that loads data and renders
a `*-client.tsx` client component.

| Page | Role | What it does |
|---|---|---|
| `admin` | super-admin | Create/edit/archive organizations and users; generate API keys. |
| `tests` | manager | CRUD the test catalogue; bulk Excel upload; paginated search. |
| `panels` | manager | Create/edit/delete panels (bundles of tests). |
| `calculator` | manager, employee | Pick tests, compute a panel price, log the result. |
| `logs` | manager | Browse the pricing audit trail; filter by date and source. |
| `analytics` | manager | Gross-margin analysis; current vs future overhead/volume scenarios. |

### API routes — `src/app/api/`
- `auth/[...nextauth]/route.ts` — NextAuth handlers.
- `health/route.ts` — `GET`; runs `SELECT 1`, returns `{status:"ok"}`
  or HTTP 503. Used by the Fly health check.
- `v1/pricing/route.ts` — `POST`; the public pricing API.

### Library — `src/lib/`
- `pricing.ts` — the pricing algorithm (see below).
- `rate-limit.ts` — in-memory fixed-window limiter for the public API.
- `auth/` — NextAuth config, API-key hashing.
- `validations/schemas.ts` — Zod schemas for every mutation and the API.
- `db/client.ts` — the singleton Prisma client.
- `db/actions/` — server actions (`"use server"`): mutations with auth
  + Zod validation. Files: `admin-actions`, `test-actions` (includes
  the ExcelJS upload), `panel-actions`, `calculator-actions`,
  `analytics-actions`.
- `db/queries/` — read-only data fetchers (organizations, tests,
  panels, logs, users) with pagination/search.

## Pricing algorithm

Implemented in `src/lib/pricing.ts`, using the tenant's parameters from
its `organizations` row.

1. **Anchor** — the test with the highest list price is the anchor and
   is priced at full list price.
2. **Add-ons** — every other test is priced at the higher of:
   - *discount price* = `listPrice × discountFactor` (default 0.5), and
   - *floor price* = `floorMultiplier × (reagentCost + marginalOverhead)`
     (default multiplier 3).
3. **Panel total** = sum of test prices + `donationPerPanel` +
   `revenueSharePerPanel` fixed charges.

The analytics page additionally computes gross margin (price minus
reagent cost and overhead) and projects it under "future" overhead and
volume assumptions stored on the org.

## The public pricing API

`POST /api/v1/pricing`

- **Auth:** `Authorization: Bearer <api-key>`. The key is SHA-256 hashed
  and matched against `organizations.api_key`. Archived orgs are
  rejected.
- **Rate limited:** per-IP and per-org windows (`src/lib/rate-limit.ts`).
- **Request:** `{ "organization": "<name or code>", "test_ids": [...] }`
  (max 100 ids), validated by Zod.
- **Response:** total price in CAD plus a breakdown (anchor test, add-on
  tests with the pricing method used, subtotal, donation, revenue
  share).
- **Errors:** 400 validation, 401 bad/missing key, 404 unknown org or
  tests, 429 rate limited, 500 internal.
- Every successful call is written to `pricing_logs` with
  `source = "api"`.

## Tests

- `tests/unit/` — Vitest, pure logic (pricing, schemas, rate limit,
  api-key, error formatting). No database.
- `tests/integration/` — Vitest against a real Postgres
  (`docker-compose.test.yml`); exercises server actions and the API
  route.
- `tests/e2e/` — Playwright specs plus a Python suite driving the live
  UI.

See [`../TESTING-GUIDE.md`](../TESTING-GUIDE.md) for the manual QA
script.

## What there is NOT

No background workers, no message queue, no Redis, no object storage, no
transactional email, no CI pipeline. The system is intentionally a
single web app plus a database. Keep it that way unless a requirement
genuinely forces otherwise.
