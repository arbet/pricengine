import { beforeEach, vi } from "vitest";

// Shared mutable session, swapped per test via setSession().
const hoisted = vi.hoisted(() => ({ session: null as unknown }));

// next/cache is a server-only no-op in tests.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Replace NextAuth's auth() with a controllable stub.
vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(async () => hoisted.session),
}));

import { prisma } from "@/lib/db/client";

export type TestSession = {
  user: { id: string; role: string; orgId: string | null };
} | null;

export function setSession(session: TestSession) {
  hoisted.session = session;
}

const TABLES = ["organizations", "users", "lab_tests", "panels", "panel_tests", "pricing_logs"];

beforeEach(async () => {
  hoisted.session = null;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(",")} RESTART IDENTITY CASCADE`
  );
});
