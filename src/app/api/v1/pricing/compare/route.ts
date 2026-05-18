import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { validateSuperAdminKey } from "@/lib/auth/api-key";
import { apiCompareRequestSchema } from "@/lib/validations/schemas";
import {
  buildBreakdown,
  calculatePanelPrice,
  PricingConfig,
  PricingTestInput,
} from "@/lib/pricing";

type Organization = Awaited<ReturnType<typeof prisma.organization.findFirst>>;

export async function POST(request: NextRequest) {
  try {
    // Authenticate via super-admin API key (cross-organization access)
    const admin = await validateSuperAdminKey(request.headers.get("authorization"));
    if (!admin) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing super-admin API key" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = apiCompareRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: parsed.error.issues[0]?.message || "Invalid request",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { test_ids, organizations } = parsed.data;

    // Resolve target organizations
    let targetOrgs: NonNullable<Organization>[];

    if (organizations) {
      // Explicit selection: resolve each identifier by name or code
      const identifiers = [...new Set(organizations)];
      const found = await prisma.organization.findMany({
        where: {
          archivedAt: null,
          OR: [{ name: { in: identifiers } }, { code: { in: identifiers } }],
        },
      });

      const missingOrgs = identifiers.filter(
        (id) => !found.some((o) => o.name === id || o.code === id)
      );
      if (missingOrgs.length > 0) {
        return NextResponse.json(
          {
            error: "not_found",
            message: `Organizations not found: ${missingOrgs.join(", ")}`,
            missing_organizations: missingOrgs,
          },
          { status: 404 }
        );
      }

      // Preserve the order the caller requested
      targetOrgs = identifiers.map(
        (id) => found.find((o) => o.name === id || o.code === id)!
      );
    } else {
      // Compare across every active organization
      targetOrgs = await prisma.organization.findMany({
        where: { archivedAt: null },
        orderBy: { name: "asc" },
      });
    }

    // Fetch all relevant tests for all target orgs in one query
    const orgIds = targetOrgs.map((o) => o.id);
    const allTests = await prisma.labTest.findMany({
      where: { testId: { in: test_ids }, orgId: { in: orgIds } },
    });

    const testsByOrg = new Map<string, typeof allTests>();
    for (const t of allTests) {
      const list = testsByOrg.get(t.orgId);
      if (list) list.push(t);
      else testsByOrg.set(t.orgId, [t]);
    }

    // Price the panel for each organization
    const results = targetOrgs.map((org) => {
      const orgTests = testsByOrg.get(org.id) ?? [];
      const foundTestIds = new Set(orgTests.map((t) => t.testId));
      const missingIds = test_ids.filter((id) => !foundTestIds.has(id));

      if (missingIds.length > 0) {
        return {
          organization: org.name,
          organization_code: org.code,
          available: false as const,
          missing_test_ids: missingIds,
          message: `Tests not found for this organization: ${missingIds.join(", ")}`,
        };
      }

      const config: PricingConfig = {
        discountFactor: Number(org.discountFactor),
        floorMultiplier: Number(org.floorMultiplier),
        marginalOverhead: Number(org.marginalOverhead),
        donationPerPanel: Number(org.donationPerPanel),
        revenueSharePerPanel: Number(org.revenueSharePerPanel),
      };

      const testInputs: PricingTestInput[] = orgTests.map((t) => ({
        id: t.id,
        testId: t.testId,
        name: t.name,
        reagentCost: Number(t.reagentCost),
        listPrice: Number(t.listPrice),
      }));

      const pricing = calculatePanelPrice(testInputs, config);

      return {
        organization: org.name,
        organization_code: org.code,
        available: true as const,
        total_price: pricing.totalPrice,
        breakdown: buildBreakdown(pricing),
        _orgId: org.id,
        _testNames: orgTests.map((t) => t.name),
      };
    });

    // Log each successfully priced panel
    const priced = results.filter(
      (r): r is Extract<typeof r, { available: true }> => r.available
    );
    if (priced.length > 0) {
      await prisma.pricingLog.createMany({
        data: priced.map((r) => ({
          panelTestIds: test_ids,
          panelTestNames: r._testNames,
          finalPrice: r.total_price,
          source: "api" as const,
          orgId: r._orgId,
        })),
      });
    }

    // Strip internal fields from the response
    const organizationsResponse = results.map((r) => {
      if (!r.available) return r;
      const { _orgId, _testNames, ...rest } = r;
      void _orgId;
      void _testNames;
      return rest;
    });

    // When more than one organization is compared, surface the cheapest
    let cheapest: { organization: string; total_price: number } | null = null;
    if (targetOrgs.length > 1 && priced.length > 0) {
      const min = priced.reduce((a, b) => (b.total_price < a.total_price ? b : a));
      cheapest = { organization: min.organization, total_price: min.total_price };
    }

    return NextResponse.json({
      currency: "CAD",
      panel_composition: test_ids,
      organizations: organizationsResponse,
      cheapest,
      calculated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
