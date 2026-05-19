# Vendors & accounts

Every external account this product depends on, what it provides, who
currently owns it, and how to transfer it.

> **Items marked `<TBD>`** must be filled in by the current owner before
> handover — they depend on live billing/console state and can't be
> safely committed without verification.

## Inventory at a glance

| Vendor | What it provides | Critical? | Current owner | To transfer |
|---|---|---|---|---|
| **Fly.io** | All hosting — the app and the PostgreSQL database | Yes | `<TBD>` (current Fly org) | Move the app + DB to the client's Fly organization, or transfer the org. |
| **GitHub** (`arbet/pricengine`) | Source code hosting | Yes | `arbet` org | Repo transfer to the client's GitHub org. |
| **Domain registrar** | Custom domain, *if one is used* | No (defaults to `pricengine.fly.dev`) | `<TBD>` | Transfer registrar with auth code; re-point at Fly. |

That is the entire vendor list. PriceEngine has no AWS account, no
email provider, no error-tracking SaaS, no paging service, no CI
provider. Keeping the dependency surface this small is deliberate.

## Fly.io

- **App:** `pricengine` (region `lhr`). Config in
  [`../fly.toml`](../fly.toml).
- **Database:** a Fly Postgres cluster (suggested name
  `pricengine-db`), attached to the app — the attachment is what
  populates the `DATABASE_URL` secret.
- **Secrets stored on the app:** `DATABASE_URL` (set by the DB
  attachment), `NEXTAUTH_SECRET`, `AUTH_SECRET`, `NEXTAUTH_URL`. List
  them with `fly secrets list --app pricengine` (names only, not
  values).
- **Billing:** pay-as-you-go. With `min_machines_running = 0` the app
  VM costs little when idle; the Postgres cluster runs continuously.
  Current monthly cost: `<TBD>`.
- **Owner today:** `<TBD>` — the Fly organization the app currently
  lives in.

### To transfer

Fly.io does not transfer individual apps between organizations cleanly.
Two practical options:

1. **Transfer the whole Fly organization** — if the org contains only
   PriceEngine, add the client as an org member, make them an admin,
   then have them remove the previous owner. Billing follows the org.
2. **Re-create in the client's org** — the client creates their own Fly
   org and the app is redeployed there from the repo (it is fully
   reproducible: `fly apps create` + `fly postgres create` + restore the
   DB from a snapshot + `fly deploy`). Use this if the current org has
   other unrelated apps.

Either way:

- The client must end up owning the Fly org that holds the app and the
  Postgres cluster.
- Rotate `NEXTAUTH_SECRET` / `AUTH_SECRET` after transfer (see
  [`runbook.md`](runbook.md)).
- Confirm the client's payment method is the one on file.

See [`transfer.md`](transfer.md) for the exact ordered procedure.

## GitHub

- **Repo:** `arbet/pricengine`. SSH remote
  `git@github.com:arbet/pricengine.git`.
- **Default branch:** `main`.
- **CI:** none — there are no GitHub Actions workflows. Nothing in the
  repo needs GitHub-stored secrets.
- **Plan:** `<TBD — Free / Team>`.

### To transfer

GitHub Settings → General → Transfer ownership → the client's GitHub
organization (which they must create first). Because there is no CI and
no OIDC trust relationship, nothing else needs updating after the
transfer — just update the `origin` remote on any local clones:

```bash
git remote set-url origin git@github.com:<client-org>/pricengine.git
```

## Domain (only if a custom domain is used)

By default the app is served at `pricengine.fly.dev`, which requires no
registrar and transfers automatically with the Fly app.

If a custom domain is added later:

- Register/own the domain at a registrar.
- Add it to Fly: `fly certs add <domain> --app pricengine`, then create
  the DNS records Fly prints.
- Update `NEXTAUTH_URL` to the custom domain and redeploy.
- To transfer: unlock the domain at the current registrar, get the EPP
  auth code, initiate an inbound transfer at the client's registrar,
  wait 5–7 days. DNS keeps working throughout as long as the records
  are preserved.

## What stays with the previous owner (nothing, after a clean transfer)

After [`transfer.md`](transfer.md) is fully executed, no production
asset remains under the previous owner's name.
