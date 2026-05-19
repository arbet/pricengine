-- Production bootstrap for the restricted application role.
--
-- Run ONCE per production database, before the first deploy, as a role that
-- can CREATE ROLE (the Fly Postgres cluster superuser). The app connects as
-- `pricengine_app` at runtime so PostgreSQL Row-Level Security is enforced;
-- the schema owner bypasses RLS and is used only for migrations and seeding.
--
-- Invocation (see docs/runbook.md for the full procedure):
--
--   fly proxy 5432 -a <postgres-app>
--   psql "postgres://postgres:<superuser-pw>@localhost:5432/<database>" \
--     -v app_password="<strong-password>" \
--     -v owner_role="<owner-from-DATABASE_URL>" \
--     -f prisma/bootstrap/rls-role.sql
--
-- `app_password` must also be placed in the APP_DATABASE_URL Fly secret.
-- `owner_role` is the role that runs migrations — the user in DATABASE_URL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pricengine_app') THEN
    CREATE ROLE pricengine_app LOGIN;
  END IF;
END $$;

ALTER ROLE pricengine_app WITH LOGIN PASSWORD :'app_password';

GRANT USAGE ON SCHEMA public TO pricengine_app;

-- Existing tables (covers the case where this is run after the first deploy).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pricengine_app;

-- Tables created later by the migration owner.
ALTER DEFAULT PRIVILEGES FOR ROLE :"owner_role" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pricengine_app;
