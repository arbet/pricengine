import { describe, it, expect } from "vitest";
import { createOrganization } from "@/lib/db/actions/admin-actions";
import { prisma } from "@/lib/db/client";
import { hashApiKey } from "@/lib/auth/api-key";
import { setSession } from "./setup";
import { makeOrg, makeUser, sessionFor } from "./helpers";

describe("createOrganization auth gating", () => {
  it("rejects an unauthenticated caller", async () => {
    setSession(null);
    const res = await createOrganization({ name: "New", code: "NEW1" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Unauthorized");
  });

  it("forbids a lab_manager from creating organizations", async () => {
    const org = await makeOrg();
    const manager = await makeUser(org.id, "lab_manager");
    setSession(sessionFor(manager));

    const res = await createOrganization({ name: "New", code: "NEW2" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Forbidden");
  });
});

describe("createOrganization API key handling", () => {
  it("returns a one-time plaintext key and stores only its hash", async () => {
    const admin = await makeUser(null, "super_admin");
    setSession(sessionFor(admin));

    const res = await createOrganization({ name: "Acme Labs", code: "ACME" });
    expect(res.success).toBe(true);
    if (!res.success) return;

    // plaintext key returned once, hashed value persisted
    expect(res.apiKey).toMatch(/^acme-[0-9a-f]{48}$/);
    const row = await prisma.organization.findUnique({ where: { id: res.org.id } });
    expect(row?.apiKey).toBe(hashApiKey(res.apiKey));

    // the returned org object must not leak the stored key
    expect((res.org as Record<string, unknown>).apiKey).toBeUndefined();
    expect(res.org.hasApiKey).toBe(true);
  });
});
