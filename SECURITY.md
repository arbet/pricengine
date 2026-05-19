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

## Tenant isolation (important — read this)

Tenant isolation is currently enforced **in application code**: every
query and server action in `src/lib/db/` constrains results to the
`orgId` resolved from the authenticated session. This is the control
that is actually load-bearing today.

The database also has Row-Level Security policies (migration
`20260306120001_rls_policies`) on the tenant tables, written against a
`current_setting('app.current_org_id')` session variable. **Those
policies are currently inert**: the application never issues
`SET app.current_org_id`, and it connects to Postgres as the database
owner, for whom RLS is bypassed by default.

This is a deliberate, documented state, not an accident. The
consequence: RLS is *defence in depth that is not yet wired up*. If a
future code path forgets the `orgId` filter, the database will not catch
it. Two ways to make RLS actually enforce:

1. Set `app.current_org_id` (via `SET LOCAL` inside a transaction) on
   every request, and connect as a non-owner role, **or**
2. Treat the `orgId` filter in `src/lib/db/` as the sole control and
   remove the RLS migration to avoid implying a guarantee that does not
   exist.

Recommend doing (1) before onboarding the second real tenant. Until
then, code review of `src/lib/db/` must verify the `orgId` filter on
every new query.

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
- **RLS not wired** — see "Tenant isolation" above. Accepted for v1
  with a single tenant in testing; flagged for the client to close
  before multi-tenant production use.
- **Rate limiter is in-memory** — accepted at current scale; see "Rate
  limiting".
