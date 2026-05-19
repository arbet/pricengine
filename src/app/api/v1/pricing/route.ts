import { NextRequest, NextResponse } from "next/server";
import { prisma, withTenant, tdb } from "@/lib/db/client";
import { validateApiKey } from "@/lib/auth/api-key";
import { apiPricingRequestSchema } from "@/lib/validations/schemas";
import { calculatePanelPrice, PricingConfig, PricingTestInput } from "@/lib/pricing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const IP_LIMIT = 60;
const ORG_LIMIT = 120;
const WINDOW_MS = 60_000;

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by client IP (guards against API-key brute force / DoS)
    const ip = clientIp(request.headers);
    const ipLimit = rateLimit(`pricing:ip:${ip}`, IP_LIMIT, WINDOW_MS);
    if (!ipLimit.allowed) {
      return tooManyRequests(ipLimit.retryAfterSeconds);
    }

    // Authenticate via API key
    const org = await validateApiKey(request.headers.get("authorization"));
    if (!org) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Rate limit by authenticated organization
    const orgLimit = rateLimit(`pricing:org:${org.id}`, ORG_LIMIT, WINDOW_MS);
    if (!orgLimit.allowed) {
      return tooManyRequests(orgLimit.retryAfterSeconds);
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

    // Fetch tests by lab-assigned test IDs (Row-Level Security scopes to the org)
    const tests = await withTenant({ orgId: targetOrg.id, role: "api" }, () =>
      tdb().labTest.findMany({
        where: {
          testId: { in: parsed.data.test_ids },
          orgId: targetOrg.id,
        },
      })
    );

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
    await withTenant({ orgId: targetOrg.id, role: "api" }, () =>
      tdb().pricingLog.create({
        data: {
          panelTestIds: tests.map((t) => t.testId),
          panelTestNames: tests.map((t) => t.name),
          finalPrice: result.totalPrice,
          source: "api",
          orgId: targetOrg.id,
        },
      })
    );

    // Build response per contract
    const anchorDetail = result.tests.find((t) => t.role === "anchor")!;
    const addOnDetails = result.tests.filter((t) => t.role === "add_on");

    return NextResponse.json({
      total_price: result.totalPrice,
      currency: "CAD",
      breakdown: {
        anchor_test: {
          test_id: anchorDetail.testId,
          test_name: anchorDetail.testName,
          list_price: anchorDetail.listPrice,
          reagent_cost: anchorDetail.reagentCost,
          role: "anchor",
        },
        add_on_tests: addOnDetails.map((d) => ({
          test_id: d.testId,
          test_name: d.testName,
          list_price: d.listPrice,
          applied_price: Math.round(d.finalPrice * 100) / 100,
          reagent_cost: d.reagentCost,
          role: "add_on",
          pricing_method: d.pricingMethod,
        })),
        subtotal: result.subtotal,
        donation: result.donation,
        revenue_share: result.revenueShare,
        fixed_charges: result.donation + result.revenueShare,
      },
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
