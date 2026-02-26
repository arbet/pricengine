import { LabTest } from "@/data/mock-data";

const MARGINAL_OVERHEAD = 5.0;
const DISCOUNT_FACTOR = 0.5;
const FLOOR_MULTIPLIER = 3;
const DONATION_PER_REQUEST = 2.0;
const REVENUE_SHARE_PER_REQUEST = 3.0;

export interface TestPricingDetail {
  test: LabTest;
  role: "anchor" | "add_on";
  listPrice: number;
  reagentCost: number;
  marginalOverhead: number;
  discountedPrice: number | null;
  floorPrice: number | null;
  finalPrice: number;
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

export function calculatePanelPrice(tests: LabTest[]): PricingResult {
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

  // Step 1: Sort by list price descending
  const sorted = [...tests].sort((a, b) => b.listPrice - a.listPrice);

  // Step 2: Anchor test = highest list price
  const anchor = sorted[0];
  const addOns = sorted.slice(1);

  const details: TestPricingDetail[] = [];

  // Step 3: Anchor test pricing
  details.push({
    test: anchor,
    role: "anchor",
    listPrice: anchor.listPrice,
    reagentCost: anchor.reagentCost,
    marginalOverhead: MARGINAL_OVERHEAD,
    discountedPrice: null,
    floorPrice: null,
    finalPrice: anchor.listPrice,
  });

  // Step 4: Add-on test pricing
  for (const t of addOns) {
    const discountedPrice = t.listPrice * DISCOUNT_FACTOR;
    const floorPrice = FLOOR_MULTIPLIER * (t.reagentCost + MARGINAL_OVERHEAD);
    const finalPrice = Math.max(discountedPrice, floorPrice);

    details.push({
      test: t,
      role: "add_on",
      listPrice: t.listPrice,
      reagentCost: t.reagentCost,
      marginalOverhead: MARGINAL_OVERHEAD,
      discountedPrice,
      floorPrice,
      finalPrice,
    });
  }

  const subtotal = details.reduce((sum, d) => sum + d.finalPrice, 0);
  const totalReagentCost = details.reduce((sum, d) => sum + d.reagentCost, 0);
  const totalOverhead = details.length * MARGINAL_OVERHEAD;

  return {
    tests: details,
    subtotal,
    donation: DONATION_PER_REQUEST,
    revenueShare: REVENUE_SHARE_PER_REQUEST,
    totalPrice: subtotal + DONATION_PER_REQUEST + REVENUE_SHARE_PER_REQUEST,
    totalReagentCost,
    totalOverhead,
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
