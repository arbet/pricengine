# Tasks: PriceEngine Multi-Organization Pricing Platform

**Input**: Design documents from `/specs/001-pricengine-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pricing-api.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, configure environment, prepare project for database-backed implementation

- [x] T001 Install production dependencies: prisma, @prisma/client, next-auth@5, bcryptjs, zod, exceljs via npm
- [x] T002 Install dev dependencies: vitest, @playwright/test, @types/bcryptjs via npm
- [x] T003 Create environment configuration file .env.example with DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL placeholders
- [x] T004 [P] Initialize Prisma with PostgreSQL provider via `npx prisma init` creating prisma/schema.prisma
- [x] T005 [P] Configure Vitest in vitest.config.ts at project root
- [x] T006 [P] Configure Playwright in playwright.config.ts at project root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS policies, auth framework, middleware, validation schemas -- MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define full Prisma schema with all entities (Organization, User, LabTest, Panel, PanelTest, PricingLog) including enums for Role and PricingSource in prisma/schema.prisma
- [x] T008 Create custom SQL migration for PostgreSQL Row-Level Security policies on all tenant tables (LabTest, Panel, PanelTest, PricingLog) using `current_setting('app.current_org_id')` in prisma/migrations/
- [x] T009 Create RLS policies for User table (super_admin sees all, lab_manager sees org, lab_employee sees self) and Organization table (super_admin sees all, others see own) in prisma/migrations/
- [x] T010 Implement Prisma client singleton with RLS session variable wrapper (`SET app.current_org_id`) in src/lib/db/client.ts
- [x] T011 [P] Configure NextAuth.js v5 with credentials provider, JWT callbacks enriching token with role/orgId/userId, and session callbacks in src/lib/auth/config.ts
- [x] T012 [P] Create NextAuth route handler in src/app/api/auth/[...nextauth]/route.ts
- [x] T013 [P] Define Zod validation schemas for all inputs (test CRUD, panel operations, calculator submission, analytics inputs, organization management, API request) in src/lib/validations/schemas.ts
- [x] T014 Implement route-level auth and role-based access middleware (unauthenticated -> login, lab_employee -> calculator only, lab_manager -> all lab pages, super_admin -> admin only) in src/middleware.ts
- [x] T015 Refactor auth context to use NextAuth session (useSession) instead of mock auth in src/context/auth-context.tsx
- [x] T016 Add SessionProvider wrapper to root layout in src/app/layout.tsx
- [x] T017 Create seed data script with 3 organizations, 6 users (1 super_admin, 2 lab_managers, 3 lab_employees), 20 lab tests, sample panels, and sample log entries in prisma/seed.ts
- [x] T018 Configure seed command in package.json prisma.seed field and run `npx prisma migrate dev` to verify schema

**Checkpoint**: Foundation ready -- database, auth, middleware, validation all in place. User story implementation can now begin.

---

## Phase 3: User Story 6 - Authentication and Role-Based Access (Priority: P1)

**Goal**: Users log in via centralized login page, are associated with their org and role, and can only access role-appropriate features. Multi-tenant data isolation enforced.

**Independent Test**: Log in with different roles (super_admin, lab_manager, lab_employee) and verify only role-appropriate pages are accessible. Verify cross-org data isolation.

### Implementation for User Story 6

- [x] T019 [US6] Implement user query functions (findByEmail, findById, findByOrgId) in src/lib/db/queries/users.ts
- [x] T020 [US6] Wire login page to NextAuth signIn with credentials, show validation errors, redirect to dashboard on success in src/app/page.tsx
- [x] T021 [US6] Refactor dashboard layout to use server-side session check (redirect to login if unauthenticated) in src/app/dashboard/layout.tsx
- [x] T022 [US6] Implement role-based redirect on dashboard index page (super_admin -> admin, lab_manager -> tests, lab_employee -> calculator) in src/app/dashboard/page.tsx
- [x] T023 [US6] Update sidebar navigation to show/hide links based on user role from session in src/components/sidebar.tsx

**Checkpoint**: Users can log in, see only their role-appropriate pages, and are isolated to their organization's data.

---

## Phase 4: User Story 1 - Lab Manager Manages Test Catalog (Priority: P1)

**Goal**: Lab managers upload Excel test catalogs, view/search/filter/add/edit/delete tests scoped to their organization.

**Independent Test**: Upload an Excel file and verify tests appear in list view. Edit, delete, and search tests independently.

### Implementation for User Story 1

- [x] T024 [P] [US1] Implement test query functions (findAll with search/filter/pagination, findById, findByTestId) scoped to org via RLS in src/lib/db/queries/tests.ts
- [x] T025 [P] [US1] Implement test server actions: createTest, updateTest, deleteTest with Zod validation and org scoping in src/lib/db/actions/test-actions.ts
- [x] T026 [US1] Implement Excel upload server action: parse file with ExcelJS, validate rows against Zod schema, collect errors per row, bulk upsert on success or return error report on failure in src/lib/db/actions/test-actions.ts
- [x] T027 [US1] Wire test management page to database: replace mock data with server-side data fetching, connect CRUD forms to server actions, connect Excel upload to upload action in src/app/dashboard/tests/page.tsx

**Checkpoint**: Lab managers can upload Excel files, view/search/filter/add/edit/delete tests. All test data is org-scoped.

---

## Phase 5: User Story 2 - User Calculates Panel Price (Priority: P1)

**Goal**: Any authenticated user selects tests from their org's catalog, submits a panel, and immediately sees the calculated price with full breakdown.

**Independent Test**: Select tests, submit panel, verify calculated price displays immediately and matches pricing algorithm logic.

### Implementation for User Story 2

- [x] T028 [US2] Refine pricing algorithm to accept Prisma-generated LabTest types and per-org pricing config (discount_factor, floor_multiplier, marginal_overhead, donation, revenue_share) as parameters in src/lib/pricing.ts
- [x] T029 [P] [US2] Implement panel query functions (findAll, findById with tests) scoped to org via RLS in src/lib/db/queries/panels.ts
- [x] T030 [P] [US2] Implement calculator server actions: calculatePanelPrice (fetch tests, run pricing algorithm, create PricingLog entry with source=calculator, return result) in src/lib/db/actions/calculator-actions.ts
- [x] T031 [US2] Wire calculator page to database: replace mock data with server-side test list fetching, connect panel submission to calculator action, display pricing breakdown from server response in src/app/dashboard/calculator/page.tsx

**Checkpoint**: Users can select tests, calculate panel prices in real-time, and results are logged. Pricing uses per-org configuration.

---

## Phase 6: User Story 3 - Lab Manager Analyzes Panel Profitability (Priority: P2)

**Goal**: Lab managers select/create a panel, enter overhead and volume assumptions, and view detailed profitability forecast with pricing breakdown.

**Independent Test**: Select a panel, enter overhead/volume inputs, verify analytics outputs (profitability forecast, per-test breakdown, gross margin) match expected calculations.

### Implementation for User Story 3

- [x] T032 [P] [US3] Implement analytics server actions: analyzePanel (fetch panel tests, run pricing algorithm, compute overhead-per-panel, generate profitability forecast for current and projected scenarios) in src/lib/db/actions/analytics-actions.ts
- [x] T033 [P] [US3] Implement org overhead settings update action: saveOverheadSettings (update overhead_cost, panels_per_day, future_overhead_cost, future_panels_per_day on Organization) in src/lib/db/actions/analytics-actions.ts
- [x] T034 [US3] Implement organization query functions (findById, findByCode, findAll for admin) in src/lib/db/queries/organizations.ts
- [x] T035 [US3] Wire analytics page to database: replace mock data with server-side panel/test fetching, connect overhead form to save action, connect analysis to analytics action, display profitability comparison in src/app/dashboard/analytics/page.tsx

**Checkpoint**: Lab managers can analyze panel profitability with current and projected overhead scenarios. All calculations use real org data.

---

## Phase 7: User Story 4 - Lab Manager Reviews Pricing Logs (Priority: P2)

**Goal**: Lab managers view all pricing activity for their org with date filtering and relevance-based search (exact panel match first, superset second, then by recency).

**Independent Test**: Perform pricing calculations, navigate to logs, verify entries appear with correct data. Test date filter and relevance search independently.

### Implementation for User Story 4

- [x] T036 [US4] Implement log query functions (findAll with date filter and pagination, searchByTestIds with relevance sorting using PostgreSQL array operators: exact match first, superset second, ordered by timestamp DESC within each tier) in src/lib/db/queries/logs.ts
- [x] T037 [US4] Wire logs page to database: replace mock data with server-side log fetching, connect date filter to query params, connect search to relevance search function, verify client name is never displayed in src/app/dashboard/logs/page.tsx

**Checkpoint**: Lab managers can review, filter, and search all pricing logs. Relevance sorting works correctly. Client name is never shown.

---

## Phase 8: User Story 5 - External System Requests Panel Price via API (Priority: P2)

**Goal**: External systems send API requests with org identifier and test IDs, receive calculated panel price with full breakdown. Requests are logged.

**Independent Test**: Send POST to /api/v1/pricing/calculate with valid org and test IDs, verify correct price response. Verify log entry is created.

### Implementation for User Story 5

- [x] T038 [US5] Add api_key field to Organization model in prisma/schema.prisma and create migration
- [x] T039 [US5] Implement API key validation utility (extract Bearer token, look up org by api_key, return org context) in src/lib/auth/api-key.ts
- [x] T040 [US5] Implement external pricing API route handler: validate request body with Zod, authenticate via API key, resolve org by name or code, fetch tests by IDs, run pricing algorithm, create PricingLog with source=api, return breakdown response per contract in src/app/api/v1/pricing/route.ts
- [x] T041 [US5] Update seed data to include API keys for test organizations in prisma/seed.ts

**Checkpoint**: External systems can request pricing via API. Responses match the contract spec. All API requests are logged.

---

## Phase 9: User Story 7 - PriceEngine Admin Manages Organizations (Priority: P3)

**Goal**: Super admins create and manage organizations with isolated data spaces. Each org operates independently.

**Independent Test**: Create a new organization as super_admin, verify it exists with its own isolated data space. Verify data from one org is invisible to another.

### Implementation for User Story 7

- [x] T042 [P] [US7] Implement admin server actions: createOrganization (with pricing config defaults), updateOrganization, createUser (with password hashing via bcryptjs), updateUser in src/lib/db/actions/admin-actions.ts
- [x] T043 [US7] Wire admin page to database: replace mock data with server-side org/user fetching, connect create/edit forms to admin actions, enforce super_admin-only access in src/app/dashboard/admin/page.tsx

**Checkpoint**: Super admins can create and manage organizations. Each organization operates in complete data isolation.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, deployment verification, and cross-cutting improvements

- [x] T044 Remove mock data file after all pages are wired to database in src/data/mock-data.ts
- [x] T045 Remove all mock data imports and references across all page files in src/app/dashboard/
- [x] T046 [P] Verify and update Dockerfile for production build (multi-stage: install deps, build Next.js, run with next start, prisma migrate deploy on startup) in Dockerfile
- [x] T047 [P] Verify and update Fly.io configuration (health check on /api/health, environment variables, postgres attachment) in fly.toml
- [x] T048 Create health check API endpoint returning status and database connectivity check in src/app/api/health/route.ts
- [x] T049 Run quickstart.md validation: verify all setup steps, test accounts, and commands work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories
- **US6 Auth (Phase 3)**: Depends on Foundational -- should complete first as login is required for all other stories
- **US1 Tests (Phase 4)**: Depends on Phase 3 (auth) -- test catalog is the data foundation
- **US2 Calculator (Phase 5)**: Depends on Phase 4 (needs test catalog data) and pricing algorithm refinement
- **US3 Analytics (Phase 6)**: Depends on Phase 5 (uses pricing algorithm, needs panels)
- **US4 Logs (Phase 7)**: Depends on Phase 5 (needs pricing log entries to exist)
- **US5 API (Phase 8)**: Depends on Phase 5 (reuses pricing algorithm and logging)
- **US7 Admin (Phase 9)**: Depends on Phase 3 (auth) only -- can run in parallel with US1-US5
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US6 (P1)**: Auth -- Start after Foundational. Blocks all other stories.
- **US1 (P1)**: Test Catalog -- Start after US6. Blocks US2 (calculator needs tests).
- **US2 (P1)**: Calculator -- Start after US1. Blocks US3, US4, US5 (they need pricing/logs).
- **US3 (P2)**: Analytics -- Start after US2. No downstream dependencies.
- **US4 (P2)**: Logs -- Start after US2. No downstream dependencies.
- **US5 (P2)**: API -- Start after US2. No downstream dependencies.
- **US7 (P3)**: Admin -- Start after US6. No downstream dependencies (can parallel with US1+).

### Within Each User Story

- Query functions before server actions
- Server actions before page wiring
- Core implementation before integration

### Parallel Opportunities

- **Phase 1**: T004, T005, T006 can run in parallel
- **Phase 2**: T011, T012, T013 can run in parallel (after T010)
- **Phase 4**: T024, T025 can run in parallel
- **Phase 5**: T029, T030 can run in parallel
- **Phase 6**: T032, T033 can run in parallel
- **Phase 8**: US5 (API), US3 (Analytics), US4 (Logs) can all run in parallel after US2 completes
- **Phase 9**: US7 (Admin) can run in parallel with US1-US5 (only needs US6)
- **Phase 10**: T046, T047 can run in parallel

---

## Parallel Example: After Phase 5 Completes

```bash
# These three story phases can proceed in parallel since they all depend only on US2 being complete:
# Developer A: Phase 6 (US3 Analytics) -- T032, T033, T034, T035
# Developer B: Phase 7 (US4 Logs) -- T036, T037
# Developer C: Phase 8 (US5 API) -- T038, T039, T040, T041
```

---

## Implementation Strategy

### MVP First (Auth + Test Catalog + Calculator)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL -- blocks all stories)
3. Complete Phase 3: US6 Authentication
4. Complete Phase 4: US1 Test Catalog
5. Complete Phase 5: US2 Pricing Calculator
6. **STOP and VALIDATE**: Users can log in, upload tests, and calculate panel prices
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. Add US6 Auth -> Login works -> Validate
3. Add US1 Test Catalog -> Upload and manage tests -> Validate
4. Add US2 Calculator -> Calculate panel prices -> Deploy/Demo (MVP!)
5. Add US3 Analytics + US4 Logs + US5 API (parallel) -> Full feature set -> Deploy/Demo
6. Add US7 Admin -> Multi-org management -> Deploy/Demo
7. Polish -> Production ready

### Suggested MVP Scope

Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (US6) + Phase 4 (US1) + Phase 5 (US2) = **Tasks T001-T031** (31 tasks)
