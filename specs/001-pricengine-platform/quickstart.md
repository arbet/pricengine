# Quickstart: PriceEngine Platform

**Feature**: 001-pricengine-platform
**Date**: 2026-03-06

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local or Docker)
- npm

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Option A: Local PostgreSQL

```bash
createdb pricengine_dev
```

Option B: Docker

```bash
docker run --name pricengine-pg -e POSTGRES_DB=pricengine_dev -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

### 3. Configure environment

Create `.env` at project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pricengine_dev"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Seed the database

```bash
npx prisma db seed
```

This creates:
- 3 organizations with pricing configurations
- 6 users (1 super admin, 2 lab managers, 3 lab employees)
- 20 lab tests across organizations
- Sample panels and log entries

### 6. Start the development server

```bash
npm run dev
```

Open http://localhost:3000

### Test Accounts

| Email | Password | Role | Organization |
|-------|----------|------|-------------|
| admin@pricengine.com | admin123 | Super Admin | (platform) |
| sarah@labcorp.com | manager123 | Lab Manager | LabCorp East |
| mike@metro.com | manager123 | Lab Manager | Metro Diagnostics |
| staff@labcorp.com | staff123 | Lab Employee | LabCorp East |

## Running Tests

```bash
# Unit tests (pricing algorithm)
npx vitest run tests/unit/

# Integration tests (requires test database)
npx vitest run tests/integration/

# E2E tests (requires running dev server)
npx playwright test
```

## Deployment (Fly.io)

### First-time setup

```bash
fly launch
fly postgres create --name pricengine-db
fly postgres attach pricengine-db

fly secrets set NEXTAUTH_SECRET="generate-a-real-secret"
fly secrets set NEXTAUTH_URL="https://your-app.fly.dev"
```

### Deploy

```bash
fly deploy
```

### Run migrations in production

```bash
fly ssh console -C "npx prisma migrate deploy"
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/pricing.ts` | Core pricing algorithm |
| `src/lib/auth/config.ts` | NextAuth.js configuration |
| `src/lib/db/client.ts` | Prisma client with RLS session setup |
| `src/lib/db/queries/` | Data access functions per entity |
| `src/lib/db/actions/` | Server actions (mutations) |
| `src/lib/validations/schemas.ts` | Zod validation schemas |
| `src/middleware.ts` | Route-level auth + role enforcement |
| `prisma/schema.prisma` | Database schema |
