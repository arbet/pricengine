# Research: PriceEngine Platform

**Feature**: 001-pricengine-platform
**Date**: 2026-03-06

## R1: PostgreSQL Row-Level Security with Prisma

**Decision**: Use Prisma for schema management and migrations, with raw SQL migrations to create RLS policies. Set `current_setting('app.current_org_id')` per-transaction via Prisma `$executeRawUnsafe` before queries.

**Rationale**: Prisma does not natively support RLS policy creation, but it handles migrations well. RLS policies are defined in custom SQL migrations. At runtime, each request sets a PostgreSQL session variable (`app.current_org_id`) before executing queries, and RLS policies use this variable to filter rows. This provides database-level isolation even if application code has bugs.

**Pattern**:
1. Prisma migration creates tables with `org_id` columns
2. Custom SQL migration adds RLS policies: `CREATE POLICY org_isolation ON <table> USING (org_id = current_setting('app.current_org_id')::text)`
3. A wrapper around Prisma client sets `app.current_org_id` from the authenticated session before each operation
4. The `users` table and `organizations` table have different RLS policies (admin access patterns differ)

**Alternatives considered**:
- Application-level filtering only (`.where({ orgId })` on every query): Rejected because a single missed filter leaks data across tenants. RLS is the safety net.
- Drizzle ORM: Viable alternative with more SQL control, but Prisma's migration tooling and type generation are more mature for this use case.
- Separate databases per tenant: Overkill for expected scale (low hundreds of orgs). Connection pooling and operational complexity increase dramatically.

## R2: NextAuth.js Configuration for Multi-Tenant Roles

**Decision**: Use NextAuth.js (Auth.js) v5 with credentials provider. Session JWT includes `role`, `orgId`, and `userId` claims.

**Rationale**: The SRS specifies a centralized login page with platform-managed authentication. NextAuth.js credentials provider fits this model. JWT sessions avoid server-side session storage. Custom claims in the JWT enable middleware to enforce role-based access without a database lookup on every request.

**Pattern**:
1. Credentials provider validates email/password against the `users` table
2. JWT callback enriches the token with `role`, `orgId`, `userId`
3. Session callback exposes these fields to client-side `useSession()`
4. Middleware reads the JWT to enforce route-level access rules
5. Server actions read the session to get `orgId` for database queries

**Alternatives considered**:
- OAuth providers (Google, GitHub): Not specified in SRS. Lab employees use shared staff accounts, which don't map well to personal OAuth. Can be added later.
- Session-based (database sessions): Adds a database query per request. JWT is simpler for this use case.

## R3: Deployment on Fly.io

**Decision**: Deploy as a Docker container on Fly.io with Fly Postgres for the database. All infrastructure MUST be on Fly.io.

**Rationale**: Stakeholder decision to use Fly.io exclusively. Fly.io supports Docker-based deployment, co-locates app and database in the same region, and provides managed PostgreSQL. The existing `Dockerfile` and `fly.toml` in the project root confirm this. External PG providers (Neon, Supabase, etc.) are not permitted.

**Pattern**:
1. Multi-stage Dockerfile: install deps, build Next.js, run with `next start`
2. Fly Postgres attached as a managed addon
3. `DATABASE_URL` set as a Fly secret
4. `NEXTAUTH_SECRET` and `NEXTAUTH_URL` set as Fly secrets
5. Health check on `/api/health` endpoint

**Alternatives considered**:
- Vercel: Constitution default. Rejected per stakeholder request. Vercel's serverless model also complicates persistent DB connections and RLS session variable setting.
- Railway: Similar to Fly.io but less mature PostgreSQL offering.
- Self-hosted: Unnecessary operational burden for this scale.

## R4: Excel Upload and Parsing

**Decision**: Use ExcelJS for server-side Excel parsing in a server action.

**Rationale**: ExcelJS supports streaming reads of `.xlsx` files, handles large files without loading everything into memory, and provides cell-level access for validation. The upload flow: client sends FormData with the file, server action parses it with ExcelJS, validates rows (required fields, duplicate IDs, data types), and bulk-inserts valid tests into the database.

**Pattern**:
1. Client sends file via `<input type="file">` and FormData
2. Server action receives the file, creates ExcelJS Workbook from buffer
3. Iterate rows, validate each against Zod schema
4. Collect validation errors per row
5. If no errors: bulk upsert into `lab_tests` table (scoped to org)
6. If errors: return error report to client (no data written)

**Alternatives considered**:
- SheetJS (xlsx): Lighter weight but less control over streaming and validation. ExcelJS is better for row-level validation workflows.
- CSV only: Simpler but SRS specifically requires Excel format.

## R5: Testing Strategy

**Decision**: Vitest for unit and integration tests, Playwright for E2E.

**Rationale**: Vitest is fast, TypeScript-native, and compatible with the Next.js ecosystem. Playwright handles browser-based E2E testing including authentication flows. Critical paths (pricing algorithm, multi-tenant isolation, auth) get dedicated test suites per Constitution Principle V.

**Pattern**:
- Unit tests: Pricing algorithm pure functions (no DB needed)
- Integration tests: Database queries with RLS verification (test DB with seed data, verify cross-tenant isolation)
- E2E tests: Login flow, calculator submission, log verification

**Alternatives considered**:
- Jest: Slower, more configuration needed for ESM/TypeScript.
- Cypress: Heavier than Playwright, less native TypeScript support.

## R6: Pricing Algorithm Refinements

**Decision**: Port the existing `src/lib/pricing.ts` to work with Prisma types. Keep it as a pure function that accepts test data and returns pricing results.

**Rationale**: The existing implementation already implements the SRS pricing logic (anchor test, add-on discounting, floor price, fixed charges). It needs to accept Prisma-generated `LabTest` types instead of mock interfaces. The function remains pure (no DB access) so it's testable without a database.

**Current hardcoded values in prototype**:
- Discount factor: 0.5 (50%)
- Floor price multiplier: 3x
- Marginal overhead per test: $5
- Donation per panel: $2
- Revenue share per panel: $3

**Decision on configurability**: These values should be stored per-organization in the database (in an `org_settings` or directly on the `organizations` table) so different labs can have different pricing rules. The pricing function accepts these as parameters rather than hardcoding them.

**Alternatives considered**:
- Keep values hardcoded: Simpler but violates the SRS requirement that each organization operates independently with its own configuration.
- Global config file: Doesn't support per-org customization.

## R7: Log Relevance Sorting

**Decision**: Implement the SRS relevance sorting (exact panel match first, superset match second, then by date) using PostgreSQL array operators.

**Rationale**: Panel composition is stored as an array of test IDs. When searching for tests S and X:
1. Exact match: `panel_test_ids = ARRAY[S, X]` (after sorting both sides)
2. Superset: `panel_test_ids @> ARRAY[S, X]` AND not exact match
3. Within each group: order by `created_at DESC`

This can be expressed as a single query with `ORDER BY` using a CASE expression for relevance tier.

**Alternatives considered**:
- Full-text search: Overkill for array containment queries.
- Application-level sorting: Pushes more data to the app server and loses database-level pagination.
