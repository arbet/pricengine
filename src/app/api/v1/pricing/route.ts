import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { validateApiKey } from "@/lib/auth/api-key";
import { apiPricingRequestSchema } from "@/lib/validations/schemas";
import { buildBreakdown, calculatePanelPrice, PricingConfig, PricingTestInput } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const org = await validateApiKey(request.headers.get("authorization"));
    if (!org) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = apiPricingRequestSchema.safeParse(body);

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

    // Resolve organization by name or code
    let targetOrg = org;
    const orgIdentifier = parsed.data.organization;
    if (orgIdentifier !== org.name && orgIdentifier !== org.code) {
      // API key org doesn't match requested org
      const found = await prisma.organization.findFirst({
        where: {
          OR: [{ name: orgIdentifier }, { code: orgIdentifier }],
        },
      });
      if (!found) {
        return NextResponse.json(
          { error: "not_found", message: `Organization '${orgIdentifier}' not found` },
          { status: 404 }
        );
      }
      // Only allow if API key belongs to this org
      if (found.id !== org.id) {
        return NextResponse.json(
          { error: "unauthorized", message: "API key does not belong to the requested organization" },
          { status: 401 }
        );
      }
      targetOrg = found;
    }

    // Fetch tests by lab-assigned test IDs
    const tests = await prisma.labTest.findMany({
      where: {
        testId: { in: parsed.data.test_ids },
        orgId: targetOrg.id,
      },
    });

    // Check for missing tests
    const foundTestIds = new Set(tests.map((t) => t.testId));
    const missingIds = parsed.data.test_ids.filter((id) => !foundTestIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          error: "not_found",
          message: `Tests not found: ${missingIds.join(", ")}`,
          missing_ids: missingIds,
        },
        { status: 404 }
      );
    }

    // Calculate pricing
    const config: PricingConfig = {
      discountFactor: Number(targetOrg.discountFactor),
      floorMultiplier: Number(targetOrg.floorMultiplier),
      marginalOverhead: Number(targetOrg.marginalOverhead),
      donationPerPanel: Number(targetOrg.donationPerPanel),
      revenueSharePerPanel: Number(targetOrg.revenueSharePerPanel),
    };

    const testInputs: PricingTestInput[] = tests.map((t) => ({
      id: t.id,
      testId: t.testId,
      name: t.name,
      reagentCost: Number(t.reagentCost),
      listPrice: Number(t.listPrice),
    }));

    const result = calculatePanelPrice(testInputs, config);

    // Log the pricing request
    await prisma.pricingLog.create({
      data: {
        panelTestIds: tests.map((t) => t.testId),
        panelTestNames: tests.map((t) => t.name),
        finalPrice: result.totalPrice,
        source: "api",
        orgId: targetOrg.id,
      },
    });

    // Build response per contract
    return NextResponse.json({
      total_price: result.totalPrice,
      currency: "CAD",
      breakdown: buildBreakdown(result),
      panel_composition: parsed.data.test_ids,
      calculated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
