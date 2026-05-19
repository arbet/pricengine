import { describe, it, expect } from "vitest";
import { withTenant, tdb } from "@/lib/db/client";
import { makeOrg, makeTest } from "./helpers";

/**
 * Proves PostgreSQL Row-Level Security is actually enforced for the restricted
 * application role — i.e. isolation holds even for a query with no app-level
 * orgId filter. If RLS were inert these would fail.
 */
describe("Row-Level Security enforcement", () => {
  it("scopes an unfiltered read to the current org", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    await makeTest(orgA.id, { name: "A test" });
    await makeTest(orgB.id, { name: "B test" });

    // No where clause — only RLS constrains the result set.
    const seenByA = await withTenant(
      { orgId: orgA.id, role: "lab_manager" },
      () => tdb().labTest.findMany()
    );
    const seenByB = await withTenant(
      { orgId: orgB.id, role: "lab_manager" },
      () => tdb().labTest.findMany()
    );

    expect(seenByA.map((t) => t.orgId)).toEqual([orgA.id]);
    expect(seenByB.map((t) => t.orgId)).toEqual([orgB.id]);
  });

  it("hides another org's row from a lookup by id", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    const bTest = await makeTest(orgB.id);

    const found = await withTenant(
      { orgId: orgA.id, role: "lab_manager" },
      () => tdb().labTest.findUnique({ where: { id: bTest.id } })
    );

    expect(found).toBeNull();
  });

  it("blocks writing a row into another org", async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();

    await expect(
      withTenant({ orgId: orgA.id, role: "lab_manager" }, () =>
        tdb().labTest.create({
          data: {
            testId: "T-CROSS",
            name: "cross-tenant",
            reagentCost: 1,
            listPrice: 1,
            orgId: orgB.id,
          },
        })
      )
    ).rejects.toThrow();
  });

  it("throws if tdb() is used outside withTenant()", () => {
    expect(() => tdb()).toThrow(/withTenant/);
  });
});
