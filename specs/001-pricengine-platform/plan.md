# Implementation Plan: PriceEngine Multi-Organization Pricing Platform

**Branch**: `001-pricengine-platform` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pricengine-platform/spec.md`

## Summary

PriceEngine is a multi-tenant pricing platform for independent laboratory organizations. The existing prototype has a complete client-side UI (Next.js 15, React 19, Tailwind CSS 4) with mock in-memory data. This plan transitions the prototype to a production-ready application backed by PostgreSQL with Row-Level Security, NextAuth.js for authentication, Prisma ORM for data access, and deployment on Fly.io. The pricing algorithm, analytics engine, and all UI pages already exist and need to be wired to real data sources.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js
**Primary Dependencies**: Next.js 15 (App Router), React 19, Prisma, NextAuth.js (Auth.js), Zod, ExcelJS, Tailwind CSS 4
**Storage**: PostgreSQL 16 with Row-Level Security (RLS)
**Testing**: Vitest (unit + integration), Playwright (E2E)
**Target Platform**: Fly.io (Docker container) + Fly Postgres
**Project Type**: Web application (full-stack, single codebase)
**Performance Goals**: Pricing calculations < 100ms, page loads < 2s, API responses < 500ms
**Constraints**: Strict per-organization data isolation via RLS, role-based access enforcement at middleware + server action + database levels
**Scale/Scope**: Low hundreds of concurrent users, thousands of tests per organization, single deployment region initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Tenancy Isolation | PASS | PostgreSQL RLS on all tenant tables with `org_id` column. Session resolves org before any data access. |
| II. Type Safety End-to-End | PASS | TypeScript strict mode, Prisma-generated types, Zod validation on all server actions and API routes. |
| III. Simplicity (YAGNI) | PASS | Single Next.js codebase serves UI + internal API + external API. No microservices. Existing prototype UI is preserved. |
| IV. Security by Default | PASS | NextAuth.js sessions with role + orgId claims. Middleware for route-level access. Server actions for operation-level. RLS for data-level. |
| V. Test Coverage on Critical Paths | PASS | Pricing algorithm, multi-tenant isolation, and auth boundaries will have dedicated test suites. |
| Technology Constraints | PASS | Fly.io hosting per constitution v1.1.0 amendment. |

## Project Structure

### Documentation (this feature)

```text
specs/001-pricengine-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── pricing-api.md   # External pricing API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                     # Login page (existing)
│   ├── layout.tsx                   # Root layout (existing, add SessionProvider)
│   ├── globals.css                  # Tailwind theme (existing)
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts            # NextAuth route handler (new)
│   │   └── v1/
│   │       └── pricing/
│   │           └── route.ts        # External pricing API (new)
│   └── dashboard/
│       ├── page.tsx                 # Role-based redirect (existing)
│       ├── layout.tsx               # Dashboard layout with auth check (existing, refactor to server)
│       ├── admin/page.tsx           # Org management (existing, wire to DB)
│       ├── tests/page.tsx           # Test management (existing, wire to DB)
│       ├── panels/page.tsx          # Panel management (existing, wire to DB)
│       ├── calculator/page.tsx      # Pricing calculator (existing, wire to DB)
│       ├── analytics/page.tsx       # Analytics (existing, wire to DB)
│       └── logs/page.tsx            # Logs (existing, wire to DB)
├── components/
│   ├── header.tsx                   # Page header (existing)
│   ├── sidebar.tsx                  # Navigation sidebar (existing)
│   └── modal.tsx                    # Modal component (existing)
├── lib/
│   ├── pricing.ts                   # Pricing algorithm (existing, refine types)
│   ├── auth/
│   │   └── config.ts               # NextAuth configuration (new)
│   ├── db/
│   │   ├── client.ts               # Prisma client singleton (new)
│   │   ├── queries/                 # Data access functions per entity (new)
│   │   │   ├── organizations.ts
│   │   │   ├── tests.ts
│   │   │   ├── panels.ts
│   │   │   ├── logs.ts
│   │   │   └── users.ts
│   │   └── actions/                 # Server actions (new)
│   │       ├── test-actions.ts
│   │       ├── panel-actions.ts
│   │       ├── calculator-actions.ts
│   │       ├── analytics-actions.ts
│   │       └── admin-actions.ts
│   └── validations/
│       └── schemas.ts              # Zod schemas for all inputs (new)
├── context/
│   └── auth-context.tsx            # Auth context (existing, refactor to use NextAuth session)
├── data/
│   └── mock-data.ts                # Mock data (existing, remove after migration)
└── middleware.ts                    # Route-level auth + role enforcement (new)

prisma/
├── schema.prisma                   # Database schema with RLS annotations (new)
├── migrations/                     # Migration history (new)
└── seed.ts                         # Seed data for development (new)

tests/
├── unit/
│   └── pricing.test.ts             # Pricing algorithm tests (new)
├── integration/
│   ├── auth.test.ts                # Auth + role enforcement tests (new)
│   └── multi-tenant.test.ts        # Cross-tenant isolation tests (new)
└── e2e/
    └── calculator.test.ts          # End-to-end calculator flow (new)

Dockerfile                          # Docker build for Fly.io (existing, verify/update)
fly.toml                            # Fly.io configuration (existing, verify/update)
```

**Structure Decision**: Single Next.js codebase (matching Constitution Principle III). The existing prototype structure under `src/app/` is preserved. New directories added: `src/lib/db/` for data access layer, `src/lib/auth/` for auth config, `src/lib/validations/` for Zod schemas, `prisma/` for schema and migrations, `tests/` for test suites. The `src/data/mock-data.ts` file will be removed once all pages are wired to the database.

## Complexity Tracking

> No constitution violations. Fly.io hosting is now the binding constraint per constitution v1.1.0.
