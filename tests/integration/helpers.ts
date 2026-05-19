import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-key";
import type { TestSession } from "./setup";

type Role = "super_admin" | "lab_manager" | "lab_employee";

export async function makeOrg(overrides: Record<string, unknown> = {}) {
  return prisma.organization.create({
    data: {
      name: `Org ${randomUUID()}`,
      code: `O${randomUUID().slice(0, 6)}`,
      ...overrides,
    },
  });
}

/** Create an org with an API key; returns the org and the plaintext key. */
export async function makeOrgWithKey(overrides: Record<string, unknown> = {}) {
  const code = `O${randomUUID().slice(0, 6)}`;
  const plainKey = generateApiKey(code);
  const org = await prisma.organization.create({
    data: {
      name: `Org ${randomUUID()}`,
      code,
      apiKey: hashApiKey(plainKey),
      ...overrides,
    },
  });
  return { org, plainKey };
}

export async function makeUser(
  orgId: string | null,
  role: Role,
  overrides: Record<string, unknown> = {}
) {
  return prisma.user.create({
    data: {
      name: "Test User",
      email: `u-${randomUUID()}@example.com`,
      passwordHash: "not-a-real-hash",
      role,
      orgId,
      ...overrides,
    },
  });
}

export async function makeTest(orgId: string, overrides: Record<string, unknown> = {}) {
  return prisma.labTest.create({
    data: {
      testId: `T-${randomUUID().slice(0, 8)}`,
      name: "Lab Test",
      reagentCost: 5,
      listPrice: 50,
      orgId,
      ...overrides,
    },
  });
}

/** Build the session shape that server actions read. */
export function sessionFor(user: {
  id: string;
  role: string;
  orgId: string | null;
}): TestSession {
  return { user: { id: user.id, role: user.role, orgId: user.orgId } };
}
