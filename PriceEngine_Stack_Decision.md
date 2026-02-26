# PriceEngine Technology Stack Decision

## Next.js + PostgreSQL

**Date:** February 26, 2026
**Prepared for:** PriceEngine Stakeholders and Development Team
**Status:** Proposal

---

## 1. Executive Summary

This document recommends **Next.js (App Router) with PostgreSQL** as the technology stack for PriceEngine, a multi-tenant pricing platform serving independent laboratory organizations. This stack delivers the fastest path to production while satisfying every functional and non-functional requirement in the SRS, with a single codebase and minimal operational overhead.

---

## 2. Proposed Stack

| Layer              | Technology                        |
|--------------------|-----------------------------------|
| Framework          | Next.js 15 (App Router)           |
| Language           | TypeScript                        |
| Frontend           | React 19                          |
| Database           | PostgreSQL 16                     |
| ORM                | Prisma (or Drizzle)               |
| Authentication     | NextAuth.js (Auth.js)             |
| Excel Parsing      | ExcelJS / SheetJS                  |
| Hosting            | Vercel + Managed PostgreSQL       |
| External API       | Next.js Route Handlers            |

---

## 3. Why This Stack Fits PriceEngine

### 3.1 Multi-Tenancy and Data Isolation

The most critical requirement in the SRS is strict per-organization data isolation. PostgreSQL provides **Row-Level Security (RLS)**, which enforces tenant boundaries at the database engine level. Every query, regardless of what application code executes it, is filtered by the authenticated organization's identifier. This eliminates an entire class of data leakage bugs that application-level filtering alone cannot prevent.

With RLS, even a coding mistake in a new feature cannot accidentally expose one lab's test catalog, pricing rules, or logs to another lab. The database itself acts as the final gatekeeper.

### 3.2 Single Codebase, Single Deployment

PriceEngine requires:

- A web application with multiple pages (Login, Test Management, Pricing Calculator, Logs, Analytics)
- An external API endpoint for pricing calculation requests
- Server-side logic for the pricing algorithm, Excel parsing, and analytics computation

Next.js handles all three in a single project. The frontend pages, the internal API calls, and the external pricing API all live in one repository and deploy as one unit. This means:

- **One CI/CD pipeline** instead of two or three
- **No cross-origin configuration** between frontend and backend
- **No API versioning headaches** between a separate SPA and a separate backend
- **One place to define types** shared across client and server (TypeScript end-to-end)

For a team building PriceEngine, this reduces operational complexity significantly compared to managing a separate Go/Python backend and a separate React frontend.

### 3.3 Role-Based Access Control

The SRS defines three roles: Super Admin, Lab Manager, and Lab Employee. NextAuth.js supports session-based authentication with custom role and organization fields baked into the session token. Middleware in Next.js can enforce role checks at the route level before any page or API handler executes.

This maps directly to the SRS requirements:

| Role            | Access                                         |
|-----------------|------------------------------------------------|
| Super Admin     | Organization management, global configuration  |
| Lab Manager     | Test catalog, pricing rules, analytics, logs   |
| Lab Employee    | Pricing calculator only                        |

Role enforcement happens in middleware (route-level) and in individual server actions (operation-level), providing defense in depth.

### 3.4 The Pricing Calculator and Algorithm

The pricing algorithm described in the SRS (anchor test identification, add-on discounting with floor prices, fixed charges) is arithmetic over small datasets. A typical calculation involves:

1. Retrieving a handful of tests from the database
2. Sorting by list price
3. Applying discount factors and floor price logic
4. Summing the result

This executes in single-digit milliseconds in any language. Node.js running TypeScript handles this with zero performance concern. The SRS requirement for "real-time" calculation on submission is trivially met.

Using Next.js Server Actions or Route Handlers, the calculator can execute server-side and return results without a full page reload, giving users an instant response.

### 3.5 External API

The SRS requires an external API that accepts an organization identifier and test data, then returns a calculated panel price. In Next.js, this is a Route Handler file that:

1. Validates the API key or token
2. Resolves the organization
3. Runs the same pricing algorithm used by the calculator page
4. Returns the result as JSON

There is no need for a separate API server. The same pricing logic is shared between the calculator page and the external API, guaranteeing consistency. One function, two entry points.

### 3.6 Excel Upload and Test Management

The SRS requires bulk upload of test catalogs via Excel files. The Node.js ecosystem has mature libraries for this:

- **ExcelJS** provides streaming read/write of `.xlsx` files with validation support
- **SheetJS (xlsx)** is a lightweight alternative for parse-only use cases

Server-side parsing in a Next.js API route or server action allows validation (required fields, duplicate test IDs, data types) before database insertion, exactly as the SRS specifies.

The CRUD operations for test management (add, edit, delete, search, filter) are standard data table operations that React component libraries handle well. Combined with Prisma for type-safe database queries, this is the most productive environment for building data management pages.

### 3.7 Logs and Audit Trail

The SRS requires logging every pricing request with timestamp, panel composition, and final price, with search and relevance-based sorting. PostgreSQL's full-text search, GIN indexes, and array column types make this straightforward:

- Panel composition can be stored as an array or JSONB column
- Relevance sorting (exact match first, superset match second, then by date) maps to a PostgreSQL query with ordered conditions
- Filtering by date range and panel composition uses standard indexed queries

No external search engine (Elasticsearch, etc.) is needed for this scale and query pattern.

### 3.8 Analytics and Profitability Modeling

The analytics module takes overhead and volume inputs and produces profitability forecasts and cost breakdowns. This is computation over user-provided parameters combined with stored test data. It runs entirely server-side and returns structured results for the frontend to render as tables or charts.

Next.js server components can fetch and compute this data before sending HTML to the client, eliminating loading spinners for the analytics page. The user sees a fully rendered profitability breakdown on page load.

---

## 4. Developer Productivity

### TypeScript End-to-End

A single language across the entire stack means:

- Database schema types generated by Prisma are used directly in React components
- No translation layer between backend response types and frontend display types
- Developers context-switch less and move faster
- New team members ramp up on one language, one framework

### Ecosystem and Tooling

Next.js has the largest ecosystem of any full-stack JavaScript framework. This matters for:

- **Component libraries** for data tables, forms, and charts (the bulk of PriceEngine's UI)
- **Authentication libraries** with built-in session management
- **Deployment platforms** with zero-configuration hosting (Vercel, Netlify, AWS Amplify)
- **Community support** for troubleshooting and best practices

### Iteration Speed

Features like hot module reloading, server actions (no manual API wiring), and file-based routing mean the development cycle from idea to working feature is shorter than with any separated frontend/backend architecture.

---

## 5. Operational Simplicity

| Concern                | Next.js + PostgreSQL         | Separated Stacks (e.g., Go + React) |
|------------------------|------------------------------|--------------------------------------|
| Repositories           | 1                            | 2+                                   |
| Deploy pipelines       | 1                            | 2+                                   |
| Servers to monitor     | 1 app + 1 database           | 2 apps + 1 database                  |
| Type sharing           | Automatic (TypeScript)       | Manual (OpenAPI, codegen)            |
| API contract changes   | Compile-time checked         | Runtime failures possible            |
| CORS configuration     | Not needed                   | Required                             |
| Environment management | 1 set of env vars            | 2+ sets of env vars                  |

Every additional moving part is a potential source of downtime, configuration drift, and debugging complexity. For a platform like PriceEngine that serves as an internal tool for laboratories, operational simplicity translates directly to reliability.

---

## 6. Scalability Path

PriceEngine's load profile is modest: lab managers configuring tests and reviewing analytics, lab employees running the pricing calculator, and external API consumers requesting panel prices. This is not a consumer-scale application.

However, if scale becomes a concern:

- **Vercel's edge network** handles global distribution and auto-scaling of the Next.js application
- **PostgreSQL read replicas** can offload analytics and log queries from the primary database
- **Connection pooling** (PgBouncer or Prisma Accelerate) handles concurrent database connections
- **The pricing algorithm can be extracted** into a standalone serverless function or microservice later if API traffic grows independently of the web application

The architecture does not box you in. It starts simple and scales incrementally.

---

## 7. Security Considerations

| Requirement                          | How It's Met                                                  |
|--------------------------------------|---------------------------------------------------------------|
| Data isolation per organization      | PostgreSQL Row-Level Security                                  |
| Role-based access enforcement        | NextAuth.js sessions + Next.js middleware                      |
| Authentication                       | Centralized login via NextAuth.js (supports credentials, OAuth)|
| API authentication                   | API key validation in Route Handlers                           |
| Input validation                     | Zod schemas on all server actions and API routes               |
| SQL injection prevention             | Prisma parameterized queries (no raw SQL by default)           |
| XSS prevention                       | React's default output escaping + CSP headers                  |

---

## 8. Comparison to Alternatives Considered

### Why Not Go + React SPA?

Go is an excellent language and the MVP's pricing logic was written in Go. However:

- It requires maintaining two codebases with separate build and deploy pipelines
- Type sharing between Go structs and TypeScript interfaces requires manual synchronization or codegen tooling
- CRUD-heavy pages (test management, logs) require significantly more boilerplate in Go than in a full-stack JS framework
- The pricing algorithm is simple arithmetic that does not benefit from Go's performance characteristics
- The team loses the productivity gains of a unified TypeScript stack

The Go MVP serves as a valuable **reference implementation** for the pricing algorithm logic, which can be ported to TypeScript with high fidelity.

### Why Not Laravel + Inertia?

Laravel is a mature framework with strong multi-tenancy packages. However:

- It introduces PHP as an additional language when the frontend will be JavaScript/TypeScript regardless
- The JavaScript ecosystem has surpassed PHP in tooling, component libraries, and deployment options for this class of application
- Hiring and team scaling is easier with a JavaScript/TypeScript stack

---

## 9. Recommended Project Structure

```
pricengine/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login page
│   │   ├── (dashboard)/        # Authenticated pages
│   │   │   ├── tests/          # Test Management (Lab Manager)
│   │   │   ├── calculator/     # Pricing Calculator (All Users)
│   │   │   ├── logs/           # Audit Logs (Lab Manager)
│   │   │   ├── analytics/      # Profitability Analytics (Lab Manager)
│   │   │   └── admin/          # Super Admin pages
│   │   └── api/
│   │       └── v1/
│   │           └── pricing/    # External Pricing API
│   ├── lib/
│   │   ├── pricing/            # Pricing algorithm (shared)
│   │   ├── auth/               # Auth configuration
│   │   └── db/                 # Database utilities
│   └── components/             # Shared UI components
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration history
└── tests/                      # Test suite
```

---

## 10. Conclusion

Next.js with PostgreSQL is the right choice for PriceEngine because it delivers every requirement in the SRS with the least operational complexity. It provides database-level tenant isolation, a single deployable that serves both the web application and external API, type safety from database to UI, and a development experience that maximizes the team's velocity.

The stack is simple where PriceEngine's requirements are simple (CRUD, auth, logging) and capable where they are complex (pricing algorithm, multi-tenancy, analytics). It does not over-engineer for hypothetical future scale, but it does not prevent scaling either.

The recommendation is to proceed with this stack and begin implementation.
