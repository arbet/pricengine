"use server";

import { withTenant, tdb } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { analyticsInputSchema, overheadSettingsSchema } from "@/lib/validations/schemas";
import { calculatePanelPrice, calculateAnalytics, PricingConfig, PricingTestInput } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import { formatError } from "./utils";

async function getManagerSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (user.role !== "lab_manager") throw new Error("Forbidden");
  if (!user.orgId) throw new Error("No organization");
  return { id: user.id, role: user.role, orgId: user.orgId };
}

export async function analyzePanel(data: {
  panelId: string;
  currentDailyOverhead: number;
  currentPanelsPerDay: number;
  futureDailyOverhead: number;
  futurePanelsPerDay: number;
}) {
  try {
    const user = await getManagerSession();
    const parsed = analyticsInputSchema.parse(data);

    const { pricingResult, analyticsResult } = await withTenant(
      { orgId: user.orgId, role: user.role },
      async () => {
        const panel = await tdb().panel.findUnique({
          where: { id: parsed.panelId },
          include: { panelTests: { include: { test: true } } },
        });

        if (!panel || panel.orgId !== user.orgId) throw new Error("Panel not found");

        const org = await tdb().organization.findUnique({ where: { id: user.orgId } });
        if (!org) throw new Error("Organization not found");

        const config: PricingConfig = {
          discountFactor: Number(org.discountFactor),
          floorMultiplier: Number(org.floorMultiplier),
          marginalOverhead: Number(org.marginalOverhead),
          donationPerPanel: Number(org.donationPerPanel),
          revenueSharePerPanel: Number(org.revenueSharePerPanel),
        };

        const testInputs: PricingTestInput[] = panel.panelTests.map((pt) => ({
          id: pt.test.id,
          testId: pt.test.testId,
          name: pt.test.name,
          reagentCost: Number(pt.test.reagentCost),
          listPrice: Number(pt.test.listPrice),
        }));

        const pricing = calculatePanelPrice(testInputs, config);
        const analytics = calculateAnalytics(pricing, {
          currentDailyOverhead: parsed.currentDailyOverhead,
          currentPanelsPerDay: parsed.currentPanelsPerDay,
          futureDailyOverhead: parsed.futureDailyOverhead,
          futurePanelsPerDay: parsed.futurePanelsPerDay,
        });

        return { pricingResult: pricing, analyticsResult: analytics };
      }
    );

    return { success: true as const, pricingResult, analyticsResult };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}

export async function saveOverheadSettings(data: {
  overheadCost: number | null;
  panelsPerDay: number | null;
  futureOverheadCost: number | null;
  futurePanelsPerDay: number | null;
}) {
  try {
    const user = await getManagerSession();
    const parsed = overheadSettingsSchema.parse(data);

    await withTenant({ orgId: user.orgId, role: user.role }, () =>
      tdb().organization.update({
        where: { id: user.orgId },
        data: {
          overheadCost: parsed.overheadCost,
          panelsPerDay: parsed.panelsPerDay,
          futureOverheadCost: parsed.futureOverheadCost,
          futurePanelsPerDay: parsed.futurePanelsPerDay,
        },
      })
    );

    revalidatePath("/dashboard/analytics");
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: formatError(e) };
  }
}
