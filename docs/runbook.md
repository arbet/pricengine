# PriceEngine — Fly.io runbook

Operational cookbook for running PriceEngine on Fly.io. All commands use
the `fly` CLI (install: <https://fly.io/docs/flyctl/install/>) and assume
you are logged in:

```bash
fly auth login
```

## Environment at a glance

| Thing | Value |
|---|---|
| Fly app | `pricengine` |
| Primary region | `lhr` (London) |
| Public URL | `https://pricengine.fly.dev` |
| VM | `shared-cpu-1`, 1 GB RAM |
| Database | Fly Postgres cluster, attached (sets `DATABASE_URL`) |
| Health check | `GET /api/health` every 30s |
| Config file | [`../fly.toml`](../fly.toml) |

`min_machines_running = 0` — the app stops when idle and cold-starts on
the next request. Expect the first request after a quiet period to be
slow.

---

## First deploy (production not yet provisioned)

The app has never been deployed to production. Do this once:

```bash
# 1. Create the app (skip if `fly apps list` already shows `pricengine`).
fly apps create pricengine

# 2. Provision a Postgres cluster and attach it (this sets DATABASE_URL).
fly postgres create --name pricengine-db --region lhr
fly postgres attach pricengine-db --app pricengine
```

**3. Bootstrap the restricted application role.** The app connects to
Postgres as a non-owner role (`pricengine_app`) so Row-Level Security is
enforced — see [`../SECURITY.md`](../SECURITY.md) → "Tenant isolation".
Create that role once, by running `prisma/bootstrap/rls-role.sql`:

```bash
# Open a proxy to the Postgres cluster.
fly proxy 5432 -a pricengine-db

# In another shell — connect as the cluster superuser and run the script.
# `owner_role` is the user in DATABASE_URL (fly postgres attach created it).
# Choose a strong `app_password`; you need it again in step 4.
psql "postgres://postgres:<superuser-pw>@localhost:5432/pricengine" \
  -v app_password="<strong-password>" \
  -v owner_role="<owner-from-DATABASE_URL>" \
  -f prisma/bootstrap/rls-role.sql
```

```bash
# 4. Set secrets. NEXTAUTH_SECRET and AUTH_SECRET must be the SAME value.
#    APP_DATABASE_URL is DATABASE_URL with the user/password swapped to
#    pricengine_app / the app_password chosen in step 3.
fly secrets set \
  NEXTAUTH_SECRET="$(openssl rand -base64 48)" \
  AUTH_SECRET="$(openssl rand -base64 48)" \
  NEXTAUTH_URL="https://pricengine.fly.dev" \
  APP_DATABASE_URL="postgres://pricengine_app:<app_password>@<host>:5432/<db>" \
  --app pricengine

# 5. Deploy.
fly deploy --app pricengine
```

The deploy runs `npx prisma migrate deploy` as the release command, so
the schema is created automatically. The database starts **empty** —
to create the first super-admin, see "Seeding production" below.

> If `APP_DATABASE_URL` is not set, the app falls back to the owner
> connection and Row-Level Security is **not** enforced. Always set it
> in production.

---

## Deploy

```bash
fly deploy --app pricengine
```

Build the Docker image, release it, run `prisma migrate deploy`, then
shift traffic. Run `npm test && npm run lint` locally first — there is
no CI to catch regressions.

Watch a deploy / check status:

```bash
fly status --app pricengine
fly releases --app pricengine
```

---

## Rollback

```bash
# List releases; find the last good version number.
fly releases --app pricengine

# Roll back to it.
fly deploy --image $(fly releases --app pricengine --json \
  | jq -r '.[1].ImageRef') --app pricengine
```

Or, more simply, check out the previous good git commit and
`fly deploy` again.

**Caution:** a rollback does **not** undo a database migration. If the
bad release included a destructive migration, see
[`disaster-recovery.md`](disaster-recovery.md) before rolling back.

---

## Logs

```bash
fly logs --app pricengine             # live tail
fly logs --app pricengine | grep -i error
```

---

## App shell

```bash
fly ssh console --app pricengine
```

Drops you into the running container (`/app`). Useful for inspecting env
or running a one-off `node`/`npx prisma` command.

---

## Database shell

```bash
fly postgres connect --app pricengine-db
```

Opens `psql` on the cluster. Or proxy it to your laptop to use a local
client:

```bash
fly proxy 5433:5432 --app pricengine-db
# then: psql postgresql://<user>:<pw>@localhost:5433/pricengine
```

Connection credentials are in the `DATABASE_URL` secret — view with
`fly ssh console --app pricengine -C "printenv DATABASE_URL"`.

---

## Seeding production

The seed script (`prisma/seed.ts`) **refuses to run** when
`NODE_ENV=production` unless `ALLOW_PRODUCTION_SEED=true`. This is a
guard against wiping a live database.

For a brand-new production database that needs its first accounts, run
the seed once, deliberately:

```bash
fly ssh console --app pricengine
# inside the container:
ALLOW_PRODUCTION_SEED=true npx prisma db seed
```

The seed prints generated passwords and API keys to stdout **once** —
capture them from `fly logs` immediately and store them in a password
manager. It does not overwrite existing rows, so re-running is safe but
will not reset forgotten credentials.

For a real client deployment you typically do **not** want the demo
orgs/tests. Instead create the first super-admin directly (see next
section) and let the client build their own data.

---

## Create a super-admin manually

If you do not want the demo seed data, create one super-admin by hand.
From an app shell (`fly ssh console`):

```bash
node -e '
const { hashSync } = require("bcryptjs");
console.log(hashSync(process.argv[1], 10));
' "the-password-you-choose"
```

Then in the DB shell, insert the user (super-admins have `org_id = NULL`):

```sql
INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
VALUES (gen_random_uuid(), 'Super Admin', 'admin@yourdomain.com',
        '<hash-from-above>', 'super_admin', now(), now());
```

The super-admin can then create organizations and users through the
admin dashboard.

---

## Rotate secrets

### Session secret (`NEXTAUTH_SECRET` / `AUTH_SECRET`)

```bash
NEW=$(openssl rand -base64 48)
fly secrets set NEXTAUTH_SECRET="$NEW" AUTH_SECRET="$NEW" --app pricengine
```

Setting a secret triggers a rolling restart. Rotating this **invalidates
every active session** — all users must log in again.

### Database password

```bash
fly postgres users list --app pricengine-db
# Rotate via the cluster, then re-attach so DATABASE_URL is refreshed:
fly postgres detach pricengine-db --app pricengine
fly postgres attach  pricengine-db --app pricengine
fly deploy --app pricengine        # pick up the new DATABASE_URL
```

### Application role password (`pricengine_app`)

This is the role the app connects as for RLS-enforced queries.

```bash
fly proxy 5432 -a pricengine-db
# In another shell, as the cluster superuser:
psql "postgres://postgres:<superuser-pw>@localhost:5432/pricengine" \
  -c "ALTER ROLE pricengine_app WITH PASSWORD '<new-password>';"

# Update the secret (same URL as before, new password) and roll the app:
fly secrets set \
  APP_DATABASE_URL="postgres://pricengine_app:<new-password>@<host>:5432/<db>" \
  --app pricengine
```

---

## Scale

The app is stateless; scale by adding machines:

```bash
fly scale count 2 --app pricengine          # two machines
fly scale vm shared-cpu-2x --app pricengine # bigger VM
```

Note: the rate limiter (`src/lib/rate-limit.ts`) is **in-memory per
machine** — running multiple machines multiplies the effective rate
budget. See [`../SECURITY.md`](../SECURITY.md) → "Rate limiting".

To keep a machine always warm (no cold starts), set
`min_machines_running = 1` in [`../fly.toml`](../fly.toml) and redeploy.

---

## Common incidents

### Health check failing / app down

```bash
fly status --app pricengine
fly logs --app pricengine
```

`/api/health` returns 503 when the database is unreachable. Check the
Postgres cluster:

```bash
fly status --app pricengine-db
```

### Deploy fails at the release command

The release command is `npx prisma migrate deploy`. A failure here means
a migration could not apply — the new version is **not** released and
the old one keeps serving. Read `fly logs`, fix the migration, redeploy.

### "Too many connections" from Postgres

The app pools connections; multiple machines plus the pool size can
exhaust a small Postgres cluster. Reduce machine count or scale the
Postgres VM (`fly machine update` on the DB app).

### Need to put the app in maintenance / stop it

```bash
fly scale count 0 --app pricengine   # stop serving
fly scale count 1 --app pricengine   # resume
```

---

## Quick links

- App config: [`../fly.toml`](../fly.toml)
- Production Dockerfile: [`../Dockerfile`](../Dockerfile)
- Disaster recovery: [`disaster-recovery.md`](disaster-recovery.md)
- Ownership transfer: [`transfer.md`](transfer.md)
