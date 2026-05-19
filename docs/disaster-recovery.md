# Disaster recovery

Backup, restore, and "everything is on fire" procedures. Pair with
[`runbook.md`](runbook.md) for routine ops.

## What's backed up automatically

| Asset | Mechanism | Retention | Notes |
|---|---|---|---|
| **PostgreSQL** | Fly Postgres daily snapshots + continuous WAL | Per Fly plan (typically a rolling window of days) | Verify the retention on the cluster — see "Check backups" below. |
| **Source code** | The GitHub repository | Indefinite | The repo plus a DB snapshot is enough to fully rebuild. |
| **Secrets** | Fly app secrets | Live only | **Not backed up.** `NEXTAUTH_SECRET` etc. must be recorded in a password manager — if lost, they can be regenerated, but rotating the session secret logs everyone out. |

What is **not** backed up:

- **The app machine** — stateless and disposable; rebuilt by
  `fly deploy` from the repo.
- **In-memory rate-limiter state** — by design; it is ephemeral.
- **Local dev databases** — disposable.

## Check backups

```bash
fly postgres list
# Inspect the cluster's snapshot/volume state:
fly volumes list --app pricengine-db
fly volumes snapshots list <volume-id>
```

Confirm the snapshot schedule and retention match expectations *before*
you need them.

## Scenario: accidental data delete

> "Someone deleted tests / panels / an org by mistake."

Note that several relations cascade on delete (deleting an organization
deletes its users, tests, panels and logs). There is no in-app undo.

If the deletion was recent, restore from a snapshot into a **new**
cluster, extract only the affected rows, and copy them back:

```bash
# 1. List snapshots and pick one from before the bad delete.
fly volumes list --app pricengine-db
fly volumes snapshots list <volume-id>

# 2. Create a new Postgres cluster from that snapshot.
fly postgres create --name pricengine-db-restore --snapshot-id <snapshot-id>

# 3. Proxy to it and pg_dump just the rows you need.
fly proxy 5434:5432 --app pricengine-db-restore
pg_dump 'postgresql://<user>:<pw>@localhost:5434/pricengine' \
  --table=lab_tests --data-only > recovered.sql

# 4. Review recovered.sql, then load the needed rows into the live DB.
# 5. Destroy the restore cluster.
fly apps destroy pricengine-db-restore
```

Take care: a blind data-only restore can collide with rows that already
exist. Inspect the dump and load selectively.

## Scenario: full database loss

> "The Postgres cluster is unrecoverable / corrupted / deleted."

1. **Provision a replacement** from the most recent snapshot:
   ```bash
   fly postgres create --name pricengine-db --snapshot-id <snapshot-id>
   ```
2. **Attach it to the app** so `DATABASE_URL` is refreshed:
   ```bash
   fly postgres detach <old-db> --app pricengine 2>/dev/null || true
   fly postgres attach pricengine-db --app pricengine
   ```
3. **Redeploy** so the app picks up the new `DATABASE_URL`:
   ```bash
   fly deploy --app pricengine
   ```
4. **Verify**: `curl -fsS https://pricengine.fly.dev/api/health` returns
   `{"status":"ok"}`, and a login works.

If no snapshot exists, the database must be rebuilt from scratch:
`prisma migrate deploy` recreates the schema (it runs on deploy), then
recreate accounts per [`runbook.md`](runbook.md) → "Create a super-admin
manually". Application data that was never snapshotted is unrecoverable.

## Scenario: bad migration shipped to production

> "A deploy applied a migration that broke / dropped data."

A Fly rollback swaps the app image but **does not revert the database**.
Order of recovery:

1. Stop further damage — `fly scale count 0 --app pricengine`.
2. Restore the database from a snapshot taken *before* the bad deploy
   (see "full database loss" above).
3. Redeploy the previous good git commit (`fly deploy`).
4. Fix the migration in the repo before attempting the deploy again.

## Scenario: lost session secret

> "`NEXTAUTH_SECRET` is gone / unknown."

Sessions cannot be recovered, but the app can: set a fresh secret
(see [`runbook.md`](runbook.md) → "Rotate secrets"). Every user is
logged out and must sign in again; no data is lost.

## Scenario: total loss

> "The Fly account is gone / inaccessible."

The system is fully reproducible from the GitHub repo plus a database
snapshot. In a new Fly account:

1. `fly apps create pricengine`
2. `fly postgres create ...` — from a snapshot if you have one,
   otherwise empty.
3. `fly postgres attach ...`
4. `fly secrets set NEXTAUTH_SECRET=... AUTH_SECRET=... NEXTAUTH_URL=...`
5. `fly deploy` — this also runs the migrations.
6. If the database was empty, recreate the first super-admin
   ([`runbook.md`](runbook.md)).
7. If a custom domain is used, re-add the Fly cert and DNS records.

Reduce the likelihood of account lockout by keeping the Fly account
email and payment method current and enabling 2FA on the Fly account.

## Recovery posture today (honest assessment)

| Risk | Mitigation today | Gap |
|---|---|---|
| Single-node Postgres outage | Fly daily snapshots | No standby replica — an outage means downtime until restore. Fly Postgres HA is available if the client wants it. |
| Region outage (`lhr`) | None | Single region. Acceptable for v1; multi-region is a larger project. |
| Secret loss | — | Secrets are not backed up; record them in a password manager. |
| No deploy gate | — | No CI; a bad migration can reach production. Run tests locally and snapshot the DB before any migration-bearing deploy. |

None of these is blocking for v1 with a single tenant in testing. They
are written down so the client can decide what to invest in.

## Periodic restore drill

Recommended quarterly: create a throwaway cluster from the latest
snapshot, proxy to it, confirm the schema and a sample row count look
right, then destroy it. This proves the restore path works *before* you
need it under pressure.

```bash
fly postgres create --name pricengine-db-drill --snapshot-id <latest>
fly proxy 5434:5432 --app pricengine-db-drill
psql 'postgresql://<user>:<pw>@localhost:5434/pricengine' \
  -c 'SELECT count(*) FROM organizations;'
fly apps destroy pricengine-db-drill
```
