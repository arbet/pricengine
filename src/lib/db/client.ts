import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

type TenantContext = { orgId: string | null; role: string };

const globalForPrisma = globalThis as unknown as {
  basePrisma?: PrismaClient;
  appPrisma?: PrismaClient;
};

function createClient(connectionString: string | undefined): PrismaClient {
  const pool = new Pool({ connectionString });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

/** Schema-owner connection — bypasses Row-Level Security. */
function baseClient(): PrismaClient {
  if (!globalForPrisma.basePrisma) {
    globalForPrisma.basePrisma = createClient(process.env.DATABASE_URL);
  }
  return globalForPrisma.basePrisma;
}

/** Restricted application-role connection — subject to Row-Level Security. */
function appClient(): PrismaClient {
  if (!globalForPrisma.appPrisma) {
    globalForPrisma.appPrisma = createClient(
      process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL
    );
  }
  return globalForPrisma.appPrisma;
}

/**
 * Unrestricted database client. Connects as the schema owner and therefore
 * BYPASSES Row-Level Security.
 *
 * Use this ONLY for auth-internal lookups that must run before a tenant
 * context exists — login, API-key validation, the session archive check —
 * and for the health check. Never read or write tenant data through it;
 * use withTenant()/tdb() so RLS is enforced.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (baseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const tenantStore = new AsyncLocalStorage<Prisma.TransactionClient>();

/**
 * Run `fn` with a tenant-scoped database connection.
 *
 * Opens a transaction on the restricted application role and sets the
 * Postgres session variables (`app.current_org_id`, `app.current_role`) that
 * the RLS policies match against. Inside `fn`, tdb() returns the transaction
 * client — every query made through it is enforced by Row-Level Security.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: () => Promise<T>,
  opts?: { timeout?: number }
): Promise<T> {
  return appClient().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.current_org_id', ${ctx.orgId ?? ""}, true)`;
      await tx.$queryRaw`SELECT set_config('app.current_role', ${ctx.role}, true)`;
      return tenantStore.run(tx, fn);
    },
    { maxWait: 5_000, timeout: opts?.timeout ?? 20_000 }
  );
}

/**
 * The tenant-scoped transaction client. Must be called within withTenant();
 * throws otherwise so a missing tenant scope fails loudly instead of silently
 * escaping Row-Level Security.
 */
export function tdb(): Prisma.TransactionClient {
  const tx = tenantStore.getStore();
  if (!tx) {
    throw new Error("tdb() must be called within withTenant()");
  }
  return tx;
}
