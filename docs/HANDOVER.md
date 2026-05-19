# Handover

This is the entry point for taking over PriceEngine. It is written for a
non-technical reader (e.g. a business owner or incoming technical lead).
If you are the developer who will run the system day-to-day, start at
[`runbook.md`](runbook.md) instead.

## What this product is

PriceEngine is a web application for clinical lab test pricing. A lab
loads its catalogue of tests, groups tests into panels, and uses a
calculator to price those panels with a configurable model (one
"anchor" test at full price, the rest discounted). Pricing is also
available as an HTTP API so other systems can request prices
programmatically.

It is multi-tenant: several labs ("organizations") can share one
deployment, each seeing only its own data.

The application is feature-complete and has unit, integration, and
end-to-end test suites. It has **not yet been deployed to production** —
deployment to Fly.io is the next step (see [`runbook.md`](runbook.md)).

## What you own after handover

After the steps in [`transfer.md`](transfer.md) are executed, you will
own:

| Asset | Description |
|---|---|
| **The code** | The full GitHub repository, transferred to your GitHub organization. |
| **The hosting** | A Fly.io account/organization running the app and its PostgreSQL database. |
| **The domain** | If a custom domain is used, transferred at the registrar. By default the app is reachable at `pricengine.fly.dev`. |
| **The secrets** | The session signing secret and database credentials — rotated to client-controlled values during transfer. |
| **The vendor accounts** | Fly.io and GitHub — see [`vendors.md`](vendors.md). |

## Where to find things

| Question | Document |
|---|---|
| What does the system look like inside? | [`architecture.md`](architecture.md) |
| Who do I owe money to, and how do I get into each account? | [`vendors.md`](vendors.md) |
| How do I transfer ownership to me? | [`transfer.md`](transfer.md) |
| If everything breaks, how do I rebuild? | [`disaster-recovery.md`](disaster-recovery.md) |
| How do I (or my engineer) operate it day-to-day? | [`runbook.md`](runbook.md) |
| What did the security review decide? | [`../SECURITY.md`](../SECURITY.md) |
| What is in the code? | [`../README.md`](../README.md) |
| How do I manually QA the app? | [`../TESTING-GUIDE.md`](../TESTING-GUIDE.md) |

## What to give a future contractor

If you bring in a developer to maintain or extend the system, give them:

1. A copy of this `docs/` folder plus the top-level `README.md` and
   `SECURITY.md`.
2. Read, then write, access to the GitHub repository.
3. A member seat on the Fly.io organization.
4. The "suggested next steps" list below.

## Suggested next steps

1. Execute [`transfer.md`](transfer.md) to take ownership of the code
   and the Fly.io account.
2. Deploy to production following [`runbook.md`](runbook.md) → "First
   deploy" — this includes provisioning the Fly Postgres database.
3. Decide whether to put the app on a custom domain or keep
   `pricengine.fly.dev`.
4. Review the security decisions in [`../SECURITY.md`](../SECURITY.md)
   and decide on the remaining accepted trade-offs (e.g. the in-memory
   rate limiter).
5. Set up a recurring (e.g. quarterly) review of:
   - The Fly.io bill.
   - Dependency security updates (`npm audit`).
   - Database backups — confirm a snapshot can actually be restored
     (see [`disaster-recovery.md`](disaster-recovery.md)).
6. Consider adding a CI pipeline (run tests + lint on every push) — the
   project intentionally ships without one.
