# PriceEngine

A multi-tenant web application for clinical lab test pricing. Labs
maintain a catalogue of tests, group them into panels, and calculate
panel prices using a configurable anchor/add-on pricing model. Pricing
is also exposed as an authenticated HTTP API for integration with
external systems.

> **Handing this off, taking it over, or just landed here?**
> Start with [`docs/HANDOVER.md`](docs/HANDOVER.md).

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.x — one
  process serving both the dashboard UI and the API.
- **Database:** PostgreSQL 17, accessed via Prisma 7 with the `pg`
  driver adapter.
- **Auth:** Auth.js / NextAuth v5 (Credentials provider, JWT sessions).
- **Validation:** Zod on every mutation and API request.
- **Excel:** ExcelJS for bulk test-catalogue upload.
- **Styling:** Tailwind CSS 4.
- **Hosting:** Fly.io — a single app (`pricengine`) plus a Fly Postgres
  cluster. Config in [`fly.toml`](fly.toml).
- **Deploy:** `fly deploy` builds the [`Dockerfile`](Dockerfile) and runs
  `npx prisma migrate deploy` as the release command.

## Repository layout

```text
src/
  app/             Next.js App Router — pages, layouts, API routes
    api/           Route handlers: auth, health, v1/pricing
    dashboard/     The six dashboard pages (tests, panels, calculator, …)
  lib/
    auth/          NextAuth config, API-key hashing
    db/            Prisma client, server actions (actions/), queries (queries/)
    validations/   Zod schemas
    pricing.ts     The pricing algorithm
    rate-limit.ts  In-memory rate limiter for the public API
  middleware.ts    Route protection + role-based access control
prisma/
  schema.prisma    Data model
  migrations/      SQL migrations
  seed.ts          Seed data (orgs, users, tests, panels, logs)
tests/
  unit/            Vitest unit tests
  integration/     Vitest integration tests (real Postgres)
  e2e/             Playwright + Python end-to-end tests
docs/              Handover & ops docs — start at docs/HANDOVER.md
```

## Local development

Requires Docker + Docker Compose. The compose stack runs Postgres and
the Next.js dev server.

```bash
cp .env.example .env
# edit .env: set NEXTAUTH_SECRET to a strong random value.

docker compose up
```

App on `http://localhost:3000`, Postgres on `localhost:5433`. The `app`
container runs migrations and seeds on start; the seed prints generated
login credentials and API keys to its log once.

To run against a local Node toolchain instead of Docker:

```bash
npm install
docker compose up -d db          # Postgres only
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Tests

```bash
npm test            # unit tests (Vitest) — no database needed
npm run test:setup  # start the test Postgres container + migrate + seed
npm run test:integration
npm run test:e2e    # Playwright; needs the app running
npm run lint
```

See [`TESTING-GUIDE.md`](TESTING-GUIDE.md) for a manual QA script.

## Deploy

Deploys are manual via the Fly CLI:

```bash
fly deploy
```

This builds the Docker image, releases it, and runs
`npx prisma migrate deploy` against the attached Fly Postgres before the
new version takes traffic. There is no CI pipeline — deploying is a
deliberate local action. For ops, rollbacks, and incident recipes see
[`docs/runbook.md`](docs/runbook.md).

## Documentation map

| | |
|---|---|
| [`docs/HANDOVER.md`](docs/HANDOVER.md) | **Start here** — overview for anyone taking over. |
| [`docs/architecture.md`](docs/architecture.md) | System diagram, services, code map. |
| [`docs/runbook.md`](docs/runbook.md) | Day-to-day operations on Fly.io. |
| [`docs/vendors.md`](docs/vendors.md) | Third-party accounts and how to get into them. |
| [`docs/disaster-recovery.md`](docs/disaster-recovery.md) | Backup, restore, total-loss rebuild. |
| [`docs/transfer.md`](docs/transfer.md) | Step-by-step ownership transfer playbook. |
| [`SECURITY.md`](SECURITY.md) | Threat model + security review decisions. |

## License

Proprietary. All rights reserved.
