"use server";

import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/config";
import { calculatePriceSchema } from "@/lib/validations/schemas";
import { calculatePanelPrice, PricingConfig, PricingTestInput } from "@/lib/pricing";

export async function calculatePrice(data: { testIds: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as { id: string; role: string; orgId: string | null };
  if (!user.orgId) throw new Error("No organization");

  const parsed = calculatePriceSchema.parse(data);

  // Fetch tests
  const tests = await prisma.labTest.findMany({
    where: { id: { in: parsed.testIds }, orgId: user.orgId },
  });

  if (tests.length === 0) {
    throw new Error("No valid tests found");
  }

  // Fetch org pricing config
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
  });

  if (!org) throw new Error("Organization not found");

  const config: PricingConfig = {
    discountFactor: Number(org.discountFactor),
    floorMultiplier: Number(org.floorMultiplier),
    marginalOverhead: Number(org.marginalOverhead),
    donationPerPanel: Number(org.donationPerPanel),
    revenueSharePerPanel: Number(org.revenueSharePerPanel),
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
      source: "calculator",
      orgId: user.orgId,
    },
  });

  return result;
}
