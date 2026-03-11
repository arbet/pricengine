import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Execute a callback within an RLS-scoped transaction.
 * Sets PostgreSQL session variables so RLS policies filter by org.
 */
export async function withOrgScope<T>(
  orgId: string,
  role: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_org_id = '${orgId}'`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_role = '${role}'`
    );
    return fn(tx as unknown as PrismaClient);
  }) as T;
}

/**
 * Execute a callback with super_admin scope (sees all orgs).
 */
export async function withAdminScope<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_role = 'super_admin'`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_org_id = ''`
    );
    return fn(tx as unknown as PrismaClient);
  }) as T;
}
