# Security posture

Reference doc recording the security decisions made before client
handover, so future changes can respect them without re-deriving the
reasoning.

## Threat model

PriceEngine is a multi-tenant pricing tool. Each tenant is a lab
("organization"); a tenant's test catalogue, panels, pricing parameters
and pricing logs are commercially sensitive and must not leak across
tenants. Trust boundaries:

- **Untrusted:** the public internet, every request body/header,
  every uploaded Excel file, every dependency not under our control.
- **Semi-trusted:** authenticated lab staff and managers — scoped to a
  single organization.
- **Trusted:** super-admins, the Fly app's runtime, the Postgres
  credential.

Main attack surfaces and how they are handled:

- **Cross-tenant data access** — every server action and query filters
  by the `orgId` taken from the server-side session, never from a
  client-supplied value. See "Tenant isolation" below.
- **Auth** — credentials are bcrypt-hashed; sessions are signed JWTs in
  httpOnly cookies. Archived users/orgs are re-checked every 60 seconds
  so a disabled account loses access without waiting for token expiry.
- **Public API abuse** — the `/api/v1/pricing` endpoint requires a
  Bearer API key (stored only as a SHA-256 hash) and is rate-limited.
- **XSS / clickjacking** — a strict Content-Security-Policy and related
  headers are enforced (see "Security headers").
- **Malicious uploads** — Excel imports are size- and row-capped and
  every row is validated with Zod before it touches the database.

## Tenant isolation

Tenant isolation is enforced at **two** layers:

1. **Application code** — every query and server action in `src/lib/db/`
   constrains results to the `orgId` resolved from the authenticated
   session.
2. **PostgreSQL Row-Level Security** — the policies in migration
   `20260306120001_rls_policies` are actively enforced. They are the
   backstop: if an application query ever forgets its `orgId` filter,
   the database still refuses to return or write another tenant's rows.

How RLS is wired (see `src/lib/db/client.ts`):

- The app connects to Postgres as a dedicated **non-owner role**
  (`pricengine_app`). RLS is bypassed for superusers and table owners,
  so a restricted role is required for the policies to apply at all.
- Every tenant data access goes through `withTenant(ctx, fn)`, which
  opens a transaction and sets the `app.current_org_id` /
  `app.current_role` session variables (via `set_config(..., true)`,
  i.e. transaction-local) that the policies match against. Inside `fn`,
  `tdb()` returns the transaction client; it throws if called outside
  `withTenant`, so a missing tenant scope fails loudly.
- Migrations and seeding still use the schema-owner connection
  (`DATABASE_URL`), which bypasses RLS — that is intentional.
- A handful of auth-internal lookups (login, the session archive check,
  API-key validation, `/api/health`) also use the owner connection
  because they must run *before* a tenant context exists. They are
  authentication machinery, not tenant data access.

The `pricengine_app` role is created by a one-time bootstrap
(`prisma/bootstrap/rls-role.sql` in production, `dev-init.sql` for
docker dev/test) — see [`runbook.md`](docs/runbook.md). Its credentials
go in the `APP_DATABASE_URL` secret.

Enforcement is covered by `tests/integration/rls.test.ts`, which proves
isolation holds even for a query with no application-level `orgId`
filter.

## Security headers

Set in [`next.config.ts`](next.config.ts) and applied to every route:

- `Content-Security-Policy` — `default-src 'self'`. `'unsafe-eval'` is
  added **only** in dev (Next.js HMR needs it); production builds do
  not get it.
- `Strict-Transport-Security` — 2 years, `includeSubDomains; preload`.
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## API keys

- A per-organization API key authenticates `/api/v1/pricing`.
- Only the **SHA-256 hash** is stored (`organizations.api_key`). The
  plaintext key is shown to the admin once at generation time and
  cannot be recovered — only regenerated.
- Hashing/verification logic: `src/lib/auth/api-key.ts`.

## Rate limiting

`src/lib/rate-limit.ts` is a fixed-window, **in-memory** limiter
protecting `/api/v1/pricing` (per-IP and per-org windows). Because it is
in-memory, the budget is *per machine*: if Fly runs more than one
machine, each enforces its own window. This is acceptable for the
current single-tenant-in-testing posture. If the API becomes
heavily used, move the limiter to a shared store (e.g. Fly Redis).

## Deploy-time secrets

The app needs these set as Fly secrets in production (see
[`runbook.md`](runbook.md)):

- `DATABASE_URL` — set automatically when a Fly Postgres cluster is
  attached.
- `NEXTAUTH_SECRET` (and `AUTH_SECRET`) — must be a strong random value.
  The `.env` / `.env.example` placeholders (`dev-secret-change-in-production`)
  must **never** reach production.
- `NEXTAUTH_URL` — the production URL (e.g. `https://pricengine.fly.dev`).
- `APP_DATABASE_URL` — the restricted-role connection string the app uses
  at runtime so Row-Level Security is enforced. See "Tenant isolation"
  above and [`runbook.md`](docs/runbook.md).

`prisma/seed.ts` refuses to run when `NODE_ENV=production` unless
`ALLOW_PRODUCTION_SEED=true` is explicitly set — this prevents
accidentally wiping or re-seeding a live database.

## What we did NOT do, and why

- **No third-party error tracker (Sentry/PostHog).** Observability is
  Fly's built-in logs and metrics plus the `/api/health` check. Adding
  one later is fine; nothing depends on its absence.
- **No CI pipeline.** Deploys are deliberate manual `fly deploy` runs.
  Tests and lint are run locally before deploying. Documented as an
  accepted choice for handover — the client can add CI later.
- **Rate limiter is in-memory** — accepted at current scale; see "Rate
  limiting".
