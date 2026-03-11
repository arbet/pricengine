-- Row-Level Security Policies for Multi-Tenant Isolation

-- Enable RLS on tenant-scoped tables
ALTER TABLE "lab_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "panels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "panel_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

-- LabTests: scoped to current org
CREATE POLICY "lab_tests_org_isolation" ON "lab_tests"
  USING (org_id = current_setting('app.current_org_id', true));
CREATE POLICY "lab_tests_org_insert" ON "lab_tests"
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Panels: scoped to current org
CREATE POLICY "panels_org_isolation" ON "panels"
  USING (org_id = current_setting('app.current_org_id', true));
CREATE POLICY "panels_org_insert" ON "panels"
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- PanelTests: inherit from panel (join through panel's org_id)
CREATE POLICY "panel_tests_org_isolation" ON "panel_tests"
  USING (
    EXISTS (
      SELECT 1 FROM "panels"
      WHERE "panels".id = "panel_tests".panel_id
      AND "panels".org_id = current_setting('app.current_org_id', true)
    )
  );
CREATE POLICY "panel_tests_org_insert" ON "panel_tests"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "panels"
      WHERE "panels".id = "panel_tests".panel_id
      AND "panels".org_id = current_setting('app.current_org_id', true)
    )
  );

-- PricingLogs: scoped to current org
CREATE POLICY "pricing_logs_org_isolation" ON "pricing_logs"
  USING (org_id = current_setting('app.current_org_id', true));
CREATE POLICY "pricing_logs_org_insert" ON "pricing_logs"
  FOR INSERT WITH CHECK (org_id = current_setting('app.current_org_id', true));

-- Users: role-based visibility
-- super_admin sees all users; lab_manager sees org users; lab_employee sees self
CREATE POLICY "users_visibility" ON "users"
  USING (
    current_setting('app.current_role', true) = 'super_admin'
    OR org_id = current_setting('app.current_org_id', true)
  );
CREATE POLICY "users_insert" ON "users"
  FOR INSERT WITH CHECK (
    current_setting('app.current_role', true) = 'super_admin'
    OR org_id = current_setting('app.current_org_id', true)
  );

-- Organizations: super_admin sees all; others see own org only
CREATE POLICY "organizations_visibility" ON "organizations"
  USING (
    current_setting('app.current_role', true) = 'super_admin'
    OR id = current_setting('app.current_org_id', true)
  );
CREATE POLICY "organizations_insert" ON "organizations"
  FOR INSERT WITH CHECK (
    current_setting('app.current_role', true) = 'super_admin'
  );

-- GIN index on pricing_logs panel_test_ids for array containment queries
CREATE INDEX "pricing_logs_panel_test_ids_gin" ON "pricing_logs" USING GIN ("panel_test_ids");
