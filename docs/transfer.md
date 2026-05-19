# Transfer playbook

Step-by-step ownership transfer of PriceEngine to the client. Execute in
order. Each step has a **Verify** subsection (don't move on until it
passes) and a **Rollback** subsection (what to do if it goes wrong).

> **Read this fully before starting.** Some steps are time-coupled and
> some are hard to reverse (secret rotation, domain transfer). Doing
> them out of order can lock someone out.

This playbook covers two situations:

- **A) The app is already deployed to production.** Do every step.
- **B) The app is not yet deployed** (the current state). Skip the
  health checks against a live URL; the client provisions and does the
  first deploy themselves per [`runbook.md`](runbook.md) → "First
  deploy". Steps 1–3 (accounts, GitHub) still apply.

## Pre-flight

Before touching anything, confirm:

- [ ] Client has chosen a **GitHub organization** for the destination
      repo.
- [ ] Client has a **Fly.io account** (and has decided: take over the
      existing Fly org, or create their own — see
      [`vendors.md`](vendors.md)).
- [ ] Client has decided whether to use a **custom domain** or stay on
      `pricengine.fly.dev`.
- [ ] You and the client are on a **call or shared chat** during the
      transfer — several steps need synchronous confirmation.
- [ ] (Situation A only) the production app is **healthy** before you
      start: `curl -fsS https://pricengine.fly.dev/api/health`.

## Order of operations

```
1. Client provisions destination accounts (GitHub org, Fly.io).
2. Grant client access alongside the current owner (no removals yet).
3. Transfer the GitHub repository.
4. Transfer the Fly.io hosting (app + Postgres).
5. Rotate the session secret.
6. (If used) transfer the custom domain.
7. End-to-end health check.
8. Remove the previous owner's access.
```

---

## 1. Client provisions destination accounts

Client does this; you wait. Confirm each:

- GitHub organization created; client has the Owner role.
- Fly.io account created; client has logged in and added a payment
  method.

**Verify:** Client shares the GitHub org name and their Fly.io account
email / org name.

---

## 2. Grant client access alongside the current owner

The principle: the client gets working access while the current owner
still has access, so neither side is blocked.

### GitHub

Add the client as a collaborator on `arbet/pricengine` with the Admin
role (Settings → Collaborators and teams). Admin is needed to accept the
upcoming repo transfer.

### Fly.io

Add the client to the Fly organization that holds the app:

```bash
fly orgs invite <client-email> --org <current-fly-org>
```

The client accepts the invite from their Fly dashboard.

**Verify:** Client can see the repo on GitHub and the `pricengine` app
in `fly apps list`.

**Rollback:** Remove the GitHub collaborator; `fly orgs remove
<client-email> --org <current-fly-org>`.

---

## 3. Transfer the GitHub repository

GitHub → repo Settings → General → Transfer ownership → enter the
client's org name. The client accepts the transfer from their org's
notifications.

After transfer the repo is `<client-org>/pricengine`. GitHub redirects
the old URL. There is **no CI and no OIDC trust** to update — nothing
else breaks.

Update the `origin` remote on any local clones:

```bash
git remote set-url origin git@github.com:<client-org>/pricengine.git
```

**Verify:** `gh repo view <client-org>/pricengine` works.

**Rollback:** Until the client accepts, the transfer can be cancelled.
After acceptance, transfer it back the same way.

---

## 4. Transfer the Fly.io hosting

Pick the path the client chose in pre-flight (see
[`vendors.md`](vendors.md) → Fly.io).

### Path A: hand over the existing Fly organization

Use this if the Fly org contains only PriceEngine.

1. Client is already a member from step 2 — promote them to **admin** of
   the org in the Fly dashboard.
2. Confirm the client's payment method is set as the org's billing
   method.
3. The previous owner is removed in step 8, not now.

### Path B: re-create in the client's own Fly org

Use this if the current Fly org has other unrelated apps.

1. Client creates their Fly org.
2. In the client's org, provision a fresh deployment following
   [`runbook.md`](runbook.md) → "First deploy" (`fly apps create`,
   `fly postgres create`, `fly postgres attach`, `fly secrets set`,
   `fly deploy`).
3. **Migrate the data** (situation A only — skip if not yet in
   production): snapshot the old database, create the new cluster from
   that snapshot, or `pg_dump` the old DB and `psql`-load it into the
   new one. See [`disaster-recovery.md`](disaster-recovery.md) for the
   snapshot/dump mechanics.
4. Once the client's deployment is verified healthy, the old app is
   destroyed in step 8.

**Verify:**
- `fly status --app pricengine` (in the client-owned org) shows the app
  running.
- `curl -fsS https://pricengine.fly.dev/api/health` returns
  `{"status":"ok"}` (situation A).

**Rollback:**
- Path A: demote the client back to member.
- Path B: the old app/org is untouched until step 8 — just keep using
  it and destroy the half-built new one.

---

## 5. Rotate the session secret

Once the client owns the hosting, rotate `NEXTAUTH_SECRET` /
`AUTH_SECRET` so the previous owner's copy is no longer valid:

```bash
NEW=$(openssl rand -base64 48)
fly secrets set NEXTAUTH_SECRET="$NEW" AUTH_SECRET="$NEW" --app pricengine
```

This triggers a rolling restart and **logs out every user** — expect
everyone to sign in again. The database password is managed by Fly and
is rotated separately if desired (see [`runbook.md`](runbook.md)).

**Verify:** After the restart, log in to the app successfully.

**Rollback:** Re-set the previous secret value (kept in a password
manager during rotation — never paste it into chat).

---

## 6. Transfer the custom domain (only if one is used)

Skip entirely if the app stays on `pricengine.fly.dev`.

1. At the current registrar: unlock the domain, disable WHOIS privacy
   temporarily, request the EPP / auth code.
2. At the client's registrar: initiate the inbound transfer, enter the
   auth code, confirm via the registrant email.
3. Wait 5–7 days for the transfer to clear.
4. Keep the DNS records pointing at Fly throughout (registrar transfer
   does not change DNS unless you let it).
5. Confirm the Fly certificate is still valid:
   `fly certs show <domain> --app pricengine`.

**Verify:** `dig <domain>` still resolves to Fly; the app serves on the
custom domain.

**Rollback:** Pending inter-registrar transfers can be cancelled.

---

## 7. End-to-end health check

Once everything above is complete:

```bash
# App is healthy:
curl -fsS https://pricengine.fly.dev/api/health

# App machine + database are running:
fly status --app pricengine
fly status --app pricengine-db
```

Then in a browser: log in, open the calculator, run one price
calculation, and confirm it appears in the logs page. Make one
`POST /api/v1/pricing` call with a valid API key.

---

## 8. Remove the previous owner's access

Only after step 7 passes:

```bash
# Fly: remove the previous owner from the org (client, an org admin, runs this).
fly orgs remove <previous-owner-email> --org <fly-org>

# GitHub: the client removes the previous owner from
# Settings → Collaborators on <client-org>/pricengine.
```

Path B only: once the client's new deployment is confirmed healthy,
destroy the old one:

```bash
fly apps destroy pricengine        # old app, in the previous owner's org
fly apps destroy pricengine-db     # old database
```

If the previous owner continues as a paid contractor, re-add them with
a scoped role — separate from this ownership transfer.

---

## Sign-off checklist

For the client to confirm in writing once all steps are done:

- [ ] GitHub repo is `<client-org>/pricengine`; client has Owner access.
- [ ] Fly.io app and Postgres are in a client-owned organization;
      client's payment method is on file.
- [ ] `NEXTAUTH_SECRET` / `AUTH_SECRET` rotated to a value only the
      client holds.
- [ ] (If applicable) custom domain transferred; WHOIS shows the client.
- [ ] App passes the end-to-end health check.
- [ ] Previous owner's access removed from GitHub and Fly.io.
- [ ] [`HANDOVER.md`](HANDOVER.md) and [`vendors.md`](vendors.md)
      updated where they say `<TBD>`.
- [ ] Security follow-ups in [`../SECURITY.md`](../SECURITY.md)
      reviewed — in particular the plan to wire up database Row-Level
      Security before onboarding a second tenant.
