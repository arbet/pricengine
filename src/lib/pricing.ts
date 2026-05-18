export interface PricingTestInput {
  id: string;
  testId: string;
  name: string;
  reagentCost: number;
  listPrice: number;
}

export interface PricingConfig {
  discountFactor: number;
  floorMultiplier: number;
  marginalOverhead: number;
  donationPerPanel: number;
  revenueSharePerPanel: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  discountFactor: 0.5,
  floorMultiplier: 3,
  marginalOverhead: 5.0,
  donationPerPanel: 2.0,
  revenueSharePerPanel: 3.0,
};

export interface TestPricingDetail {
  testId: string;
  testName: string;
  role: "anchor" | "add_on";
  listPrice: number;
  reagentCost: number;
  marginalOverhead: number;
  discountedPrice: number | null;
  floorPrice: number | null;
  finalPrice: number;
  pricingMethod: "list" | "discount" | "floor";
}

export interface PricingResult {
  tests: TestPricingDetail[];
  subtotal: number;
  donation: number;
  revenueShare: number;
  totalPrice: number;
  totalReagentCost: number;
  totalOverhead: number;
}

export function calculatePanelPrice(
  tests: PricingTestInput[],
  config: PricingConfig = DEFAULT_PRICING_CONFIG
): PricingResult {
  if (tests.length === 0) {
    return {
      tests: [],
      subtotal: 0,
      donation: 0,
      revenueShare: 0,
      totalPrice: 0,
      totalReagentCost: 0,
      totalOverhead: 0,
    };
  }

  const sorted = [...tests].sort((a, b) => b.listPrice - a.listPrice);
  const anchor = sorted[0];
  const addOns = sorted.slice(1);

  const details: TestPricingDetail[] = [];

  details.push({
    testId: anchor.testId,
    testName: anchor.name,
    role: "anchor",
    listPrice: anchor.listPrice,
    reagentCost: anchor.reagentCost,
    marginalOverhead: config.marginalOverhead,
    discountedPrice: null,
    floorPrice: null,
    finalPrice: anchor.listPrice,
    pricingMethod: "list",
  });

  for (const t of addOns) {
    const discountedPrice = t.listPrice * config.discountFactor;
    const floorPrice = config.floorMultiplier * (t.reagentCost + config.marginalOverhead);
    const finalPrice = Math.max(discountedPrice, floorPrice);

    details.push({
      testId: t.testId,
      testName: t.name,
      role: "add_on",
      listPrice: t.listPrice,
      reagentCost: t.reagentCost,
      marginalOverhead: config.marginalOverhead,
      discountedPrice,
      floorPrice,
      finalPrice,
      pricingMethod: finalPrice === discountedPrice ? "discount" : "floor",
    });
  }

  const subtotal = details.reduce((sum, d) => sum + d.finalPrice, 0);
  const totalReagentCost = details.reduce((sum, d) => sum + d.reagentCost, 0);
  const totalOverhead = details.length * config.marginalOverhead;

  return {
    tests: details,
    subtotal,
    donation: config.donationPerPanel,
    revenueShare: config.revenueSharePerPanel,
    totalPrice: subtotal + config.donationPerPanel + config.revenueSharePerPanel,
    totalReagentCost,
    totalOverhead,
  };
}

/**
 * Shapes a PricingResult into the `breakdown` object returned by the
 * external pricing API. Shared by the single-org and compare endpoints
 * so both expose an identical structure.
 */
export function buildBreakdown(result: PricingResult) {
  const anchor = result.tests.find((t) => t.role === "anchor")!;
  const addOns = result.tests.filter((t) => t.role === "add_on");

  return {
    anchor_test: {
      test_id: anchor.testId,
      test_name: anchor.testName,
      list_price: anchor.listPrice,
      reagent_cost: anchor.reagentCost,
      role: "anchor" as const,
    },
    add_on_tests: addOns.map((d) => ({
      test_id: d.testId,
      test_name: d.testName,
      list_price: d.listPrice,
      applied_price: Math.round(d.finalPrice * 100) / 100,
      reagent_cost: d.reagentCost,
      role: "add_on" as const,
      pricing_method: d.pricingMethod,
    })),
    subtotal: result.subtotal,
    donation: result.donation,
    revenue_share: result.revenueShare,
    fixed_charges: result.donation + result.revenueShare,
  };
}

export interface AnalyticsInputs {
  currentDailyOverhead: number;
  currentPanelsPerDay: number;
  futureDailyOverhead: number;
  futurePanelsPerDay: number;
}

export interface AnalyticsResult {
  currentOverheadPerPanel: number;
  futureOverheadPerPanel: number;
  panelPrice: number;
  totalReagentCost: number;
  currentTotalCost: number;
  futureTotalCost: number;
  currentGrossMargin: number;
  futureGrossMargin: number;
  currentGrossMarginPct: number;
  futureGrossMarginPct: number;
  currentProfitable: boolean;
  futureProfitable: boolean;
}

export function calculateAnalytics(
  pricingResult: PricingResult,
  inputs: AnalyticsInputs
): AnalyticsResult {
  const currentOverheadPerPanel =
    inputs.currentPanelsPerDay > 0
      ? inputs.currentDailyOverhead / inputs.currentPanelsPerDay
      : 0;
  const futureOverheadPerPanel =
    inputs.futurePanelsPerDay > 0
      ? inputs.futureDailyOverhead / inputs.futurePanelsPerDay
      : 0;

  const panelPrice = pricingResult.totalPrice;
  const totalReagentCost = pricingResult.totalReagentCost;

  const currentTotalCost = totalReagentCost + currentOverheadPerPanel;
  const futureTotalCost = totalReagentCost + futureOverheadPerPanel;

  const currentGrossMargin = panelPrice - currentTotalCost;
  const futureGrossMargin = panelPrice - futureTotalCost;

  const currentGrossMarginPct =
    panelPrice > 0 ? (currentGrossMargin / panelPrice) * 100 : 0;
  const futureGrossMarginPct =
    panelPrice > 0 ? (futureGrossMargin / panelPrice) * 100 : 0;

  return {
    currentOverheadPerPanel,
    futureOverheadPerPanel,
    panelPrice,
    totalReagentCost,
    currentTotalCost,
    futureTotalCost,
    currentGrossMargin,
    futureGrossMargin,
    currentGrossMarginPct,
    futureGrossMarginPct,
    currentProfitable: currentGrossMargin > 0,
    futureProfitable: futureGrossMargin > 0,
  };
}
