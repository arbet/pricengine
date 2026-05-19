import { describe, it, expect } from "vitest";
import { validateApiKey } from "@/lib/auth/api-key";
import { prisma } from "@/lib/db/client";
import { makeOrgWithKey } from "./helpers";

describe("validateApiKey", () => {
  it("returns the organization for a valid Bearer key", async () => {
    const { org, plainKey } = await makeOrgWithKey();
    const result = await validateApiKey(`Bearer ${plainKey}`);
    expect(result?.id).toBe(org.id);
  });

  it("returns null for an unknown key", async () => {
    await makeOrgWithKey();
    expect(await validateApiKey("Bearer not-a-real-key")).toBeNull();
  });

  it("returns null without the Bearer prefix", async () => {
    const { plainKey } = await makeOrgWithKey();
    expect(await validateApiKey(plainKey)).toBeNull();
  });

  it("returns null for a null header", async () => {
    expect(await validateApiKey(null)).toBeNull();
  });

  it("rejects a valid key for an archived organization", async () => {
    const { plainKey } = await makeOrgWithKey({ archivedAt: new Date() });
    expect(await validateApiKey(`Bearer ${plainKey}`)).toBeNull();
  });

  it("stores only the hash, never the plaintext key", async () => {
    const { org, plainKey } = await makeOrgWithKey();
    const row = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(row?.apiKey).not.toBe(plainKey);
    expect(row?.apiKey).toMatch(/^[0-9a-f]{64}$/);
  });
});
