<!--
Sync Impact Report
==================
- Version change: 1.0.0 → 1.1.0 (MINOR: hosting constraint amended)
- Version change: 1.1.0 → 1.1.1 (PATCH: require Fly Postgres exclusively)
- Modified principles: N/A
- Added sections: N/A
- Removed sections: N/A
- Modified constraints:
  - Hosting: "Vercel + Managed PG" → "Fly.io + Fly Postgres"
  - Removed allowance for external PG providers
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no update needed
    (Template is generic; hosting is filled per-feature)
  - .specify/templates/spec-template.md — ✅ no update needed
    (No hosting references)
  - .specify/templates/tasks-template.md — ✅ no update needed
    (No hosting references)
- Follow-up TODOs: none
==================
-->

# PriceEngine Constitution

## Core Principles

### I. Multi-Tenancy Isolation

Every database query MUST be scoped to the authenticated
organization. PostgreSQL Row-Level Security (RLS) MUST enforce
tenant boundaries at the database engine level. Application-level
filtering alone is insufficient — RLS acts as the final gatekeeper
so that even a coding mistake cannot expose one lab's data to
another.

- All tables containing tenant data MUST have an `org_id` column
  with an RLS policy.
- Server actions and API route handlers MUST resolve the
  authenticated organization from the session before any data
  access.
- Tests that exercise multi-tenant paths MUST verify that
  cross-tenant data is inaccessible.

### II. Type Safety End-to-End

TypeScript MUST be used across the entire stack — from Prisma
schema types through server logic to React components. Explicit
`any` casts are prohibited unless accompanied by a justification
comment and a TODO to remove them.

- Prisma-generated types MUST be used directly; manual type
  duplication is not permitted.
- Zod schemas MUST validate all external input (API routes,
  server actions, file uploads).
- `strict` mode MUST remain enabled in `tsconfig.json`.

### III. Simplicity (YAGNI)

Start with the simplest implementation that satisfies the current
requirement. Do not build abstractions, feature flags, or
extension points for hypothetical future needs.

- Prefer three similar lines of code over a premature abstraction.
- A single Next.js codebase serves the web UI, internal API, and
  external API — do not split into separate services without a
  measured need.
- New dependencies MUST solve a concrete, immediate problem.

### IV. Security by Default

Security controls MUST be structural, not opt-in. Defense in depth
is required: middleware enforces route-level access, server actions
enforce operation-level access, and RLS enforces data-level access.

- NextAuth.js sessions MUST carry `role` and `orgId` claims.
- Middleware MUST block unauthenticated and unauthorized requests
  before any page or API handler executes.
- API keys for the external pricing API MUST be validated in the
  route handler before processing.
- Input validation (Zod) MUST run server-side on every mutation.

### V. Test Coverage on Critical Paths

Tests are encouraged across the codebase but MUST exist for
critical paths: the pricing algorithm, multi-tenant isolation
logic, and authentication/authorization boundaries.

- Pricing algorithm tests MUST cover anchor detection, discount
  application, floor price logic, and fixed charges.
- Auth tests MUST verify role-based access enforcement and
  cross-tenant data isolation.
- New bug fixes SHOULD include a regression test.
- TDD is recommended but not mandated; the requirement is
  coverage of critical paths, not ceremony.

## Technology Constraints

The following technology choices are binding for all PriceEngine
development. Changes require a constitution amendment.

| Layer          | Technology               | Version    |
|----------------|--------------------------|------------|
| Framework      | Next.js (App Router)     | 15.x       |
| Language       | TypeScript               | 5.x        |
| Frontend       | React                    | 19.x       |
| Database       | PostgreSQL               | 16+        |
| ORM            | Prisma (or Drizzle)      | Latest     |
| Authentication | NextAuth.js (Auth.js)    | Latest     |
| Styling        | Tailwind CSS             | 4.x        |
| Hosting        | Fly.io + Fly Postgres    | —          |

- Server Components MUST be the default; Client Components are
  used only when interactivity requires them.
- File-based routing via the App Router MUST be used for all
  pages.
- Raw SQL is prohibited unless Prisma's query builder cannot
  express the query; raw SQL MUST use parameterized statements.
- Deployment MUST use a Docker container on Fly.io. The
  `Dockerfile` and `fly.toml` at the repository root are the
  deployment configuration source of truth.
- PostgreSQL MUST be hosted on Fly Postgres. External managed
  providers (Neon, Supabase, etc.) are not permitted.

## Development Workflow

### Code Review

- All changes to `main` MUST go through a pull request.
- PRs MUST pass linting (`next lint`) and type-checking
  (`tsc --noEmit`) before merge.
- Reviewers MUST verify compliance with this constitution's
  principles, particularly multi-tenancy isolation and type safety.

### Branching

- Feature branches follow the pattern `<issue>-<short-name>`.
- Commits SHOULD be atomic and focused on a single concern.

### Quality Gates

- No `any` casts without justification.
- No disabled ESLint rules without justification.
- No direct database access outside the data-access layer
  (`src/lib/db/`).

## Governance

This constitution is the authoritative source of project standards
for PriceEngine. It supersedes ad-hoc decisions and informal
agreements.

- **Amendments** require a pull request that updates this file,
  with a clear rationale in the PR description. The version MUST
  be incremented per semantic versioning (see below).
- **Versioning**: MAJOR for principle removals or redefinitions,
  MINOR for new principles or materially expanded guidance,
  PATCH for clarifications and wording fixes.
- **Compliance**: PR reviewers MUST check changes against this
  constitution. Violations block merge unless an amendment is
  proposed concurrently.

**Version**: 1.1.1 | **Ratified**: 2026-03-06 | **Last Amended**: 2026-03-06
