"use server";

import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { overheadSettingsSchema } from "@/lib/validations/schemas";
import { calculatePanelPrice, calculateAnalytics, PricingConfig, PricingTestInput } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

async function getManagerSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (user.role !== "lab_manager") throw new Error("Forbidden");
  if (!user.orgId) throw new Error("No organization");
  return user;
}

export async function analyzePanel(data: {
  panelId: string;
  currentDailyOverhead: number;
  currentPanelsPerDay: number;
  futureDailyOverhead: number;
  futurePanelsPerDay: number;
}) {
  const user = await getManagerSession();

  const panel = await prisma.panel.findUnique({
    where: { id: data.panelId },
    include: { panelTests: { include: { test: true } } },
  });

  if (!panel || panel.orgId !== user.orgId) throw new Error("Panel not found");

  const org = await prisma.organization.findUnique({ where: { id: user.orgId! } });
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

  const pricingResult = calculatePanelPrice(testInputs, config);
  const analyticsResult = calculateAnalytics(pricingResult, {
    currentDailyOverhead: data.currentDailyOverhead,
    currentPanelsPerDay: data.currentPanelsPerDay,
    futureDailyOverhead: data.futureDailyOverhead,
    futurePanelsPerDay: data.futurePanelsPerDay,
  });

  return { pricingResult, analyticsResult };
}

export async function saveOverheadSettings(data: {
  overheadCost: number | null;
  panelsPerDay: number | null;
  futureOverheadCost: number | null;
  futurePanelsPerDay: number | null;
}) {
  const user = await getManagerSession();
  const parsed = overheadSettingsSchema.parse(data);

  await prisma.organization.update({
    where: { id: user.orgId! },
    data: {
      overheadCost: parsed.overheadCost,
      panelsPerDay: parsed.panelsPerDay,
      futureOverheadCost: parsed.futureOverheadCost,
      futurePanelsPerDay: parsed.futurePanelsPerDay,
    },
  });

  revalidatePath("/dashboard/analytics");
  return { success: true };
}
