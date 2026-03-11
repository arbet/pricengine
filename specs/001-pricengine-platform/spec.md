# Feature Specification: PriceEngine Multi-Organization Pricing Platform

**Feature Branch**: `001-pricengine-platform`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "PriceEngine multi-organization pricing platform with test management, pricing calculator, analytics, logs, and external API based on SRS v1.0"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lab Manager Manages Test Catalog (Priority: P1)

A lab manager logs into PriceEngine and navigates to the Test Management page. They upload an Excel file containing their laboratory's test catalog (test IDs, test names, reagent costs, and list prices). The system validates the file, reports any errors (missing fields, duplicate IDs, wrong data types), and populates the test database. The lab manager can then view, search, filter, add, edit, and delete individual tests.

**Why this priority**: The test catalog is the foundation of the entire platform. Without tests, no pricing calculations, analytics, or logs can function. This is the core data entry point.

**Independent Test**: Can be fully tested by uploading an Excel file and verifying tests appear in the list view. Editing, deleting, and searching tests can each be verified independently.

**Acceptance Scenarios**:

1. **Given** a lab manager is logged in, **When** they upload a valid Excel file with test data, **Then** the system imports all tests and displays them in the test list view
2. **Given** a lab manager uploads an Excel file with duplicate test IDs, **When** the upload is processed, **Then** the system rejects the upload and displays specific validation errors
3. **Given** a lab manager uploads an Excel file missing required fields, **When** the upload is processed, **Then** the system rejects the upload and identifies the missing fields
4. **Given** tests exist in the catalog, **When** the lab manager searches by test ID or test name, **Then** matching tests are displayed
5. **Given** a test exists, **When** the lab manager edits its information and saves, **Then** the updated information is persisted
6. **Given** a test exists, **When** the lab manager deletes it, **Then** the test is removed from the catalog

---

### User Story 2 - User Calculates Panel Price (Priority: P1)

Any authenticated user (lab manager or lab employee via staff account) navigates to the Pricing Calculator page. They select tests from their organization's test catalog to build a custom panel. Upon submission, the system immediately calculates and displays the panel price using the pricing algorithm (anchor test at full list price, add-on tests at discounted/floor price, plus fixed charges).

**Why this priority**: The pricing calculator is the primary operational tool. It delivers the core value proposition of the platform -- real-time panel pricing for laboratory staff.

**Independent Test**: Can be tested by selecting tests and submitting a panel. Verify the calculated price is displayed immediately and matches expected pricing logic.

**Acceptance Scenarios**:

1. **Given** a user is logged in and tests exist in the catalog, **When** they select one or more tests and submit the panel, **Then** the system displays the calculated panel price immediately
2. **Given** a panel with multiple tests is submitted, **When** the price is calculated, **Then** the test with the highest list price is treated as the anchor test (full list price) and remaining tests are priced as add-ons
3. **Given** a panel with add-on tests, **When** pricing is calculated, **Then** each add-on test price is the maximum of (discounted price) and (floor price = 3x reagent cost plus marginal overhead)
4. **Given** a panel is submitted, **When** the price is calculated, **Then** fixed per-request donation and revenue share amounts are added to the total

---

### User Story 3 - Lab Manager Analyzes Panel Profitability (Priority: P2)

A lab manager navigates to the Analytics page, selects or creates a panel, and enters overhead and volume assumptions (current daily/monthly overhead cost, current panels per day, expected future overhead, expected future panels per day). The system calculates overhead cost per panel and displays a detailed financial breakdown including profitability forecast, pricing algorithm breakdown (anchor/add-on identification, per-test reagent cost, overhead contribution, list price), total reagent cost, total overhead cost, and gross profit margin under both current and projected conditions.

**Why this priority**: Analytics enables strategic decision-making about panel profitability. It depends on the test catalog and pricing calculator working first, but is essential for lab managers to assess financial viability.

**Independent Test**: Can be tested by selecting a panel, entering overhead/volume inputs, and verifying the analytics outputs match expected calculations.

**Acceptance Scenarios**:

1. **Given** a lab manager has a panel selected, **When** they enter current overhead cost and daily panel volume, **Then** the system calculates and displays the current overhead cost per panel
2. **Given** overhead and volume inputs are provided, **When** the analytics page loads results, **Then** a profitability forecast comparing current and projected scenarios is displayed
3. **Given** a panel is selected for analysis, **When** results are displayed, **Then** the pricing algorithm breakdown shows anchor test identification, add-on tests, and per-test details (reagent cost, overhead contribution, applied pricing)
4. **Given** a lab manager enters future overhead and volume projections, **When** the analysis runs, **Then** the system displays projected profitability alongside current profitability for comparison

---

### User Story 4 - Lab Manager Reviews Pricing Logs (Priority: P2)

A lab manager navigates to the Logs page to review all pricing activity for their organization. They can view a history of all custom panel pricing requests (from both the calculator page and external API). Each log entry shows the timestamp, panel composition (tests selected), and final calculated price. The lab manager can filter by date and search by panel composition, with results ranked by relevance (exact panel match first, then superset panels, then by most recent).

**Why this priority**: Logs provide operational visibility and audit trail capability. They depend on pricing requests being made first, making them a secondary but important feature.

**Independent Test**: Can be tested by performing pricing calculations, then navigating to logs and verifying entries appear with correct data. Filter and search can be tested independently.

**Acceptance Scenarios**:

1. **Given** pricing calculations have been performed, **When** the lab manager views the Logs page, **Then** all pricing requests are listed with timestamp, panel composition, and calculated price
2. **Given** logs exist, **When** the lab manager filters by date range, **Then** only logs within that range are displayed
3. **Given** logs exist for various panel compositions, **When** the lab manager searches for tests S and X, **Then** panels matching exactly S and X appear first, then panels containing S and X plus additional tests, then results are ordered by most recent within each relevance level
4. **Given** a pricing request was made via the external API, **When** the lab manager views logs, **Then** the API-originated request appears in the log alongside calculator-originated requests
5. **Given** a log entry exists, **When** it is displayed, **Then** client name is never shown (privacy requirement)

---

### User Story 5 - External System Requests Panel Price via API (Priority: P2)

An external system sends a pricing request to the platform's API, providing an organization identifier (organization number or name) and a list of test identifiers. The system processes the request using the specified organization's test catalog, pricing rules, and overhead configuration, then returns the calculated panel price. The request is also logged.

**Why this priority**: The external API extends the platform's reach beyond the web interface, enabling integration with other laboratory systems. It reuses the same pricing engine but requires separate access handling.

**Independent Test**: Can be tested by sending an API request with valid organization identifier and test IDs, and verifying the correct price is returned.

**Acceptance Scenarios**:

1. **Given** a valid organization identifier and test IDs, **When** an API request is submitted, **Then** the system returns the calculated panel price
2. **Given** an invalid organization identifier, **When** an API request is submitted, **Then** the system returns an appropriate error
3. **Given** a valid API request, **When** the price is calculated, **Then** the result is logged in the organization's pricing log

---

### User Story 6 - Authentication and Role-Based Access (Priority: P1)

All users access PriceEngine through a centralized login page. Upon authentication, the system associates the user with their organization and role (PriceEngine Admin, Lab Manager, or Lab Employee). Lab employees use a shared staff account. Access to features is enforced by role: Lab Managers can access Test Management, Pricing Calculator, Analytics, and Logs. Lab Employees can only access the Pricing Calculator. PriceEngine Admins manage organizations and global configuration but have no access to lab operational data unless explicitly granted.

**Why this priority**: Authentication and access control are foundational -- no feature can be securely used without it. It must be in place before any other feature is accessible.

**Independent Test**: Can be tested by logging in with different roles and verifying that only role-appropriate features are accessible.

**Acceptance Scenarios**:

1. **Given** a user navigates to the platform, **When** they are not authenticated, **Then** they are presented with the centralized login page
2. **Given** valid credentials for a Lab Manager, **When** they log in, **Then** they are associated with their organization and can access Test Management, Calculator, Analytics, and Logs
3. **Given** valid credentials for a Lab Employee (staff account), **When** they log in, **Then** they can only access the Pricing Calculator
4. **Given** valid credentials for a PriceEngine Admin, **When** they log in, **Then** they can manage organizations and global configuration but cannot see lab operational data unless explicitly granted
5. **Given** a user from Organization A, **When** they are authenticated, **Then** they can only see and interact with Organization A's data

---

### User Story 7 - PriceEngine Admin Manages Organizations (Priority: P3)

A PriceEngine Admin logs in and manages the platform's organizations. They can create new organizations, configure global system settings, and manage the multi-organization structure. Each organization operates in complete data isolation.

**Why this priority**: Organization management is an administrative prerequisite, but after initial setup, it is used infrequently compared to daily operational features.

**Independent Test**: Can be tested by creating a new organization and verifying it operates in isolation from existing organizations.

**Acceptance Scenarios**:

1. **Given** a PriceEngine Admin is logged in, **When** they create a new organization, **Then** the organization is created with its own isolated data space
2. **Given** two organizations exist, **When** data is created in one, **Then** it is not visible or accessible from the other

---

### Edge Cases

- What happens when a user uploads an Excel file with zero valid test rows?
- What happens when a panel is submitted with only one test (it becomes both the anchor and the only test)?
- What happens when all tests in a panel have the same list price (anchor selection ambiguity)?
- How does the system handle an API request with test IDs that do not exist in the organization's catalog?
- What happens when a lab manager changes test data (e.g., list price) after pricing calculations have already been logged?
- What happens when the overhead cost or volume input is zero or negative in analytics?
- How does the system handle concurrent uploads of test catalogs by the same organization?
- What happens when an Excel file contains tests with zero or negative reagent costs or list prices?

## Requirements *(mandatory)*

### Functional Requirements

**Multi-Organization Architecture**
- **FR-001**: System MUST support multiple independent laboratory organizations on the same platform
- **FR-002**: System MUST isolate users, tests, pricing data, logs, and analytics by organization
- **FR-003**: System MUST ensure that actions within one organization do not affect or expose data from any other organization

**Authentication and Access Control**
- **FR-004**: System MUST provide a centralized login page for all users
- **FR-005**: System MUST associate authenticated users with an organization and a role
- **FR-006**: System MUST enforce role-based access for platform features
- **FR-007**: System MUST support three roles: PriceEngine Admin (platform-level), Lab Manager (lab configuration and operations), and Lab Employee (calculator access only)
- **FR-008**: System MUST support a shared staff account for lab employees (individual employee accounts are not required)

**Test Management**
- **FR-009**: System MUST allow a lab manager to upload a test catalog via Excel file in a predefined format
- **FR-010**: System MUST validate uploads for required fields, duplicate test IDs, and correct data types
- **FR-011**: System MUST allow adding, editing, deleting, searching, and filtering tests
- **FR-012**: System MUST store test inputs including test ID, test name, reagent cost, and list price

**Pricing Calculator**
- **FR-013**: System MUST allow users to build a panel by selecting tests from the organization's test catalog
- **FR-014**: System MUST calculate and display the panel price immediately upon submission
- **FR-015**: System MUST support lab employees (staff account) accessing the calculator
- **FR-016**: System MUST implement the pricing algorithm: sort tests by list price descending, designate highest as anchor (full list price), price add-ons as max(discounted price, floor price), add fixed donation and revenue share charges

**External API**
- **FR-017**: System MUST accept external API requests for pricing calculations
- **FR-018**: System MUST require an organization identifier (organization number or name) for each API request
- **FR-019**: System MUST process API requests using the specified organization's configuration and data
- **FR-020**: System MUST return the calculated panel price in the API response

**Logs and Audit Trail**
- **FR-021**: System MUST log all custom panel pricing requests (from both calculator and external API)
- **FR-022**: System MUST allow lab managers to view, filter, and search pricing request history
- **FR-023**: System MUST include timestamp, panel composition, and final calculated price in each log entry
- **FR-024**: System MUST never log client name in log entries
- **FR-025**: System MUST order logs by panel composition relevance first (exact match, then superset), then by time (most recent first)

**Analytics**
- **FR-026**: System MUST allow lab managers to create or select a panel for analysis
- **FR-027**: System MUST accept overhead and volume inputs (current overhead, current daily volume, future overhead, future daily volume)
- **FR-028**: System MUST derive overhead cost per panel by distributing fixed overhead across total panels processed
- **FR-029**: System MUST display profitability forecast, pricing algorithm breakdown (anchor/add-on identification, per-test reagent cost, overhead contribution, applied pricing), total reagent cost, total overhead cost, and gross profit margin

### Key Entities

- **Organization**: An independent laboratory entity using the platform. Has its own users, tests, pricing rules, logs, and analytics. Key attributes: organization identifier (number/name), configuration settings
- **User**: A person or shared account accessing the platform. Associated with exactly one organization and one role (PriceEngine Admin, Lab Manager, or Lab Employee)
- **Test**: A laboratory test in an organization's catalog. Key attributes: test ID, test name, reagent cost, list price. Belongs to exactly one organization
- **Panel**: A custom grouping of tests selected for pricing and analysis. Composed of one or more tests from the same organization's catalog. Contains one anchor test (highest list price) and zero or more add-on tests
- **Pricing Log**: A record of a pricing calculation request. Key attributes: timestamp, panel composition, final calculated price, source (calculator or API). Belongs to one organization. Never contains client name
- **Analytics Input**: Overhead and volume assumptions for profitability modeling. Key attributes: current overhead cost, current daily panel volume, expected future overhead cost, expected future daily volume

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lab managers can upload a test catalog and have all valid tests available in the system within 2 minutes
- **SC-002**: Users can build a panel and receive a calculated price within 5 seconds of submission
- **SC-003**: Lab managers can identify whether a panel is profitable or unprofitable within one analytics session (under 3 minutes)
- **SC-004**: Lab managers can find a specific historical pricing request within 1 minute using search and filter
- **SC-005**: External systems receive a panel price response within 3 seconds of API request submission
- **SC-006**: 100% of data from one organization is invisible and inaccessible to users of another organization
- **SC-007**: Users are directed to only the features their role permits, with no ability to access restricted features
- **SC-008**: All pricing requests (calculator and API) are logged with zero data loss

### Assumptions

- The platform uses a predefined Excel format for test catalog uploads; the format specification is provided to lab managers
- The marginal discount factor and fixed charges (donation, revenue share) are configurable per organization or globally; specific values are set during organization configuration
- Lab employees access the platform through a shared staff account per organization, not individual accounts
- The pricing algorithm's "marginal overhead" value used in floor price calculation is derived from the analytics overhead-per-panel computation
- Tests with identical list prices are handled deterministically when selecting the anchor test (e.g., first encountered or by test ID order)
- The platform assumes reasonable data volumes (hundreds to low thousands of tests per organization, not millions)
