# External Pricing API Contract

**Feature**: 001-pricengine-platform
**Date**: 2026-03-06
**Base Path**: `/api/v1/pricing`

## Authentication

All requests require an API key in the `Authorization` header:

```
Authorization: Bearer <api_key>
```

API keys are issued per organization and validated server-side. An invalid or missing key returns `401 Unauthorized`.

## Endpoints

### POST /api/v1/pricing/calculate

Calculate the panel price for a given set of tests within an organization.

**Request**:

```json
{
  "organization": "LabCorp East",
  "test_ids": ["TST-001", "TST-005", "TST-012"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| organization | string | Yes | Organization name or code |
| test_ids | string[] | Yes | Array of lab-assigned test IDs (not internal UUIDs) |

**Successful Response** (200):

```json
{
  "total_price": 285.50,
  "currency": "USD",
  "breakdown": {
    "anchor_test": {
      "test_id": "TST-001",
      "test_name": "Comprehensive Metabolic Panel",
      "list_price": 150.00,
      "reagent_cost": 25.00,
      "role": "anchor"
    },
    "add_on_tests": [
      {
        "test_id": "TST-005",
        "test_name": "Lipid Panel",
        "list_price": 85.00,
        "applied_price": 65.00,
        "reagent_cost": 12.00,
        "role": "add_on",
        "pricing_method": "discount"
      },
      {
        "test_id": "TST-012",
        "test_name": "TSH",
        "list_price": 45.00,
        "applied_price": 60.50,
        "reagent_cost": 8.00,
        "role": "add_on",
        "pricing_method": "floor"
      }
    ],
    "subtotal": 275.50,
    "donation": 2.00,
    "revenue_share": 3.00,
    "fixed_charges": 5.00
  },
  "panel_composition": ["TST-001", "TST-005", "TST-012"],
  "calculated_at": "2026-03-06T14:30:00Z"
}
```

**Error Responses**:

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing or invalid fields | `{ "error": "validation_error", "message": "test_ids must be a non-empty array", "details": [...] }` |
| 401 | Missing or invalid API key | `{ "error": "unauthorized", "message": "Invalid or missing API key" }` |
| 404 | Organization not found | `{ "error": "not_found", "message": "Organization 'XYZ' not found" }` |
| 404 | One or more test IDs not found | `{ "error": "not_found", "message": "Tests not found: TST-999", "missing_ids": ["TST-999"] }` |
| 500 | Internal error | `{ "error": "internal_error", "message": "An unexpected error occurred" }` |

## Behavior Notes

- The API uses the **same pricing algorithm** as the calculator page (shared function)
- Every successful request creates a `PricingLog` entry with `source: "api"`
- The `organization` field accepts either the organization `name` or `code`
- Test IDs are the lab-assigned identifiers (e.g., "TST-001"), not internal database UUIDs
- Client name is never logged (SRS privacy requirement)
- The response includes a full pricing breakdown for transparency

## Rate Limiting

Not specified in the SRS. Initially no rate limiting. If needed, implement at the Fly.io proxy level or via middleware.
