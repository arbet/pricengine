-- Auto-applied by docker-compose (mounted into /docker-entrypoint-initdb.d/)
-- for local development and integration tests.
--
-- Creates the restricted application role `pricengine_app`. The app connects
-- as this role at runtime so PostgreSQL Row-Level Security is enforced — the
-- schema owner (`postgres`) bypasses RLS and must NOT be used for tenant data.
--
-- Production uses prisma/bootstrap/rls-role.sql instead (see docs/runbook.md).
-- The credentials here are local-only and intentionally not secret.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pricengine_app') THEN
    CREATE ROLE pricengine_app LOGIN PASSWORD 'pricengine_app_pw';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO pricengine_app;

-- Existing tables (a no-op when this runs at DB-init time, before migrations).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pricengine_app;

-- Tables created later by the migration owner (`postgres` in dev/test).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pricengine_app;
