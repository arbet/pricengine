import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createPanel, updatePanel } from "@/lib/db/actions/panel-actions";
import { setSession } from "./setup";
import { makeOrg, makeUser, makeTest, sessionFor } from "./helpers";

describe("createPanel", () => {
  it("creates a panel from the manager's own tests", async () => {
    const org = await makeOrg();
    const manager = await makeUser(org.id, "lab_manager");
    const t1 = await makeTest(org.id);
    const t2 = await makeTest(org.id);
    setSession(sessionFor(manager));

    const res = await createPanel({ name: "My Panel", testIds: [t1.id, t2.id] });
    expect(res.success).toBe(true);
  });

  it("rejects tests belonging to another organization (IDOR)", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    const manager = await makeUser(orgA.id, "lab_manager");
    const ownTest = await makeTest(orgA.id);
    const foreignTest = await makeTest(orgB.id);
    setSession(sessionFor(manager));

    const res = await createPanel({
      name: "Cross-tenant panel",
      testIds: [ownTest.id, foreignTest.id],
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Invalid test selection");
  });

  it("requires an authenticated session", async () => {
    setSession(null);
    const res = await createPanel({ name: "X", testIds: [randomUUID()] });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Unauthorized");
  });
});

describe("updatePanel", () => {
  it("rejects a foreign test added during an update (IDOR)", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    const manager = await makeUser(orgA.id, "lab_manager");
    const ownTest = await makeTest(orgA.id);
    const foreignTest = await makeTest(orgB.id);
    setSession(sessionFor(manager));

    const created = await createPanel({ name: "Panel", testIds: [ownTest.id] });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const res = await updatePanel({
      id: created.panel.id,
      name: "Panel",
      testIds: [foreignTest.id],
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Invalid test selection");
  });

  it("rejects updating a panel owned by another organization", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    const managerA = await makeUser(orgA.id, "lab_manager");
    const testA = await makeTest(orgA.id);
    setSession(sessionFor(managerA));
    const created = await createPanel({ name: "A's panel", testIds: [testA.id] });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const managerB = await makeUser(orgB.id, "lab_manager");
    const testB = await makeTest(orgB.id);
    setSession(sessionFor(managerB));
    const res = await updatePanel({
      id: created.panel.id,
      name: "hijacked",
      testIds: [testB.id],
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("Panel not found");
  });
});
