# Data Model: PriceEngine Platform

**Feature**: 001-pricengine-platform
**Date**: 2026-03-06

## Entity Relationship Overview

```
Organization 1──* User
Organization 1──* LabTest
Organization 1──* Panel
Organization 1──* PricingLog
Panel *──* LabTest (via PanelTest join)
PricingLog *──* LabTest (via log_test_ids array)
```

## Entities

### Organization

The top-level tenant entity. All other data is scoped to an organization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | String | Required, unique | Display name (e.g., "LabCorp East") |
| code | String | Required, unique | Short code for API identification |
| contact_email | String | Optional | |
| phone | String | Optional | |
| address | String | Optional | |
| discount_factor | Decimal | Required, default 0.5 | Per-org pricing config |
| floor_multiplier | Decimal | Required, default 3.0 | Floor price = multiplier * (reagent + overhead) |
| marginal_overhead | Decimal | Required, default 5.0 | Per-test overhead for floor calc |
| donation_per_panel | Decimal | Required, default 2.0 | Fixed charge per pricing request |
| revenue_share_per_panel | Decimal | Required, default 3.0 | Fixed charge per pricing request |
| overhead_cost | Decimal | Optional | Current daily/monthly overhead |
| panels_per_day | Integer | Optional | Current daily volume |
| future_overhead_cost | Decimal | Optional | Projected overhead |
| future_panels_per_day | Integer | Optional | Projected volume |
| created_at | DateTime | Auto-set | |
| updated_at | DateTime | Auto-update | |

**RLS Policy**: Admin users can see all orgs. Non-admin users see only their own org.

### User

An authenticated person or shared account.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | String | Required | |
| email | String | Required, unique | Login credential |
| password_hash | String | Required | Bcrypt hashed |
| role | Enum | Required: `super_admin`, `lab_manager`, `lab_employee` | |
| org_id | UUID | FK -> Organization, nullable for super_admin | |
| created_at | DateTime | Auto-set | |
| updated_at | DateTime | Auto-update | |

**Validation rules**:
- `super_admin` users MAY have null `org_id` (platform-level)
- `lab_manager` and `lab_employee` users MUST have a non-null `org_id`
- Email must be unique across the entire platform

**RLS Policy**: Super admins see all users. Lab managers see users in their org. Lab employees see only their own record.

### LabTest

A laboratory test in an organization's catalog.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | Internal DB ID |
| test_id | String | Required, unique per org | Lab-assigned test identifier |
| name | String | Required | |
| reagent_cost | Decimal | Required, >= 0 | |
| list_price | Decimal | Required, >= 0 | |
| category | String | Optional | Test category/grouping |
| org_id | UUID | FK -> Organization, required | |
| created_at | DateTime | Auto-set | |
| updated_at | DateTime | Auto-update | |

**Validation rules**:
- `test_id` must be unique within the same organization (compound unique: `test_id` + `org_id`)
- `reagent_cost` and `list_price` must be non-negative
- On Excel upload: required fields are `test_id`, `name`, `reagent_cost`, `list_price`

**RLS Policy**: Scoped to `org_id = current_setting('app.current_org_id')`

### Panel

A saved grouping of tests for pricing and analysis.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| name | String | Required | User-given panel name |
| org_id | UUID | FK -> Organization, required | |
| created_at | DateTime | Auto-set | |
| updated_at | DateTime | Auto-update | |

**RLS Policy**: Scoped to `org_id = current_setting('app.current_org_id')`

### PanelTest (Join Table)

Links panels to their constituent tests.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| panel_id | UUID | FK -> Panel, required | |
| test_id | UUID | FK -> LabTest, required | References LabTest internal ID |

**Validation rules**:
- A panel must have at least one test
- Same test cannot appear twice in the same panel (unique: `panel_id` + `test_id`)

**RLS Policy**: Inherits from Panel (join queries go through panel's org_id)

### PricingLog

A record of every pricing calculation request.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| timestamp | DateTime | Required, auto-set | When the calculation was performed |
| panel_test_ids | String[] | Required | Array of test_id strings (lab-assigned IDs, not UUIDs) |
| panel_test_names | String[] | Required | Array of test names (for display without join) |
| final_price | Decimal | Required | Total calculated panel price |
| source | Enum | Required: `calculator`, `api` | Where the request originated |
| org_id | UUID | FK -> Organization, required | |

**Validation rules**:
- `panel_test_ids` must not be empty
- `final_price` must be non-negative
- Client name is NEVER stored (SRS privacy requirement)

**RLS Policy**: Scoped to `org_id = current_setting('app.current_org_id')`

**Indexes**:
- GIN index on `panel_test_ids` for array containment queries
- Index on `timestamp` for date range filtering
- Index on `org_id` (covered by RLS but explicit for query performance)

## State Transitions

### Test Catalog Upload

```
File Received -> Parsing -> Validation
  -> Valid: Bulk Upsert (insert new, update existing by test_id+org_id)
  -> Invalid: Return error report (no data written)
```

### Pricing Calculation

```
Tests Selected -> Retrieve from DB -> Sort by list_price DESC
  -> Designate anchor (highest) -> Price add-ons (discount vs floor)
  -> Add fixed charges -> Return result + Log entry created
```

## Relationships Summary

- Organization has many Users, LabTests, Panels, PricingLogs
- Panel has many LabTests (through PanelTest join table)
- PricingLog stores test composition as denormalized arrays (for query performance and historical accuracy -- if tests are later deleted or modified, the log preserves what was priced)
- User belongs to one Organization (except super_admin which may be platform-level)
