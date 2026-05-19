import { describe, it, expect } from "vitest";
import {
  calculatePanelPrice,
  calculateAnalytics,
  DEFAULT_PRICING_CONFIG,
  type PricingTestInput,
} from "@/lib/pricing";

const anchor: PricingTestInput = {
  id: "a", testId: "T-ANCHOR", name: "Anchor", reagentCost: 5, listPrice: 200,
};
// discount wins: discounted = 100*0.5 = 50; floor = 3*(1+5) = 18
const addOnDiscount: PricingTestInput = {
  id: "b", testId: "T-DISC", name: "AddOn Discount", reagentCost: 1, listPrice: 100,
};
// floor wins: discounted = 20*0.5 = 10; floor = 3*(10+5) = 45
const addOnFloor: PricingTestInput = {
  id: "c", testId: "T-FLOOR", name: "AddOn Floor", reagentCost: 10, listPrice: 20,
};

describe("calculatePanelPrice", () => {
  it("returns zeros for an empty panel", () => {
    const r = calculatePanelPrice([]);
    expect(r.tests).toEqual([]);
    expect(r.subtotal).toBe(0);
    expect(r.totalPrice).toBe(0);
  });

  it("prices a single test as the anchor at list price", () => {
    const r = calculatePanelPrice([anchor], DEFAULT_PRICING_CONFIG);
    expect(r.tests).toHaveLength(1);
    expect(r.tests[0].role).toBe("anchor");
    expect(r.tests[0].pricingMethod).toBe("list");
    expect(r.tests[0].finalPrice).toBe(200);
    expect(r.subtotal).toBe(200);
    expect(r.totalPrice).toBe(200 + 2 + 3);
  });

  it("picks the highest list price as the anchor regardless of input order", () => {
    const r = calculatePanelPrice([addOnFloor, anchor, addOnDiscount]);
    expect(r.tests[0].testId).toBe("T-ANCHOR");
    expect(r.tests[0].role).toBe("anchor");
  });

  it("applies discount pricing when the discounted price beats the floor", () => {
    const r = calculatePanelPrice([anchor, addOnDiscount]);
    const detail = r.tests.find((t) => t.testId === "T-DISC")!;
    expect(detail.discountedPrice).toBe(50);
    expect(detail.floorPrice).toBe(18);
    expect(detail.finalPrice).toBe(50);
    expect(detail.pricingMethod).toBe("discount");
  });

  it("applies floor pricing when the floor beats the discounted price", () => {
    const r = calculatePanelPrice([anchor, addOnFloor]);
    const detail = r.tests.find((t) => t.testId === "T-FLOOR")!;
    expect(detail.discountedPrice).toBe(10);
    expect(detail.floorPrice).toBe(45);
    expect(detail.finalPrice).toBe(45);
    expect(detail.pricingMethod).toBe("floor");
  });

  it("sums subtotal, fixed charges and totals across a multi-test panel", () => {
    const r = calculatePanelPrice([anchor, addOnDiscount, addOnFloor]);
    expect(r.subtotal).toBe(200 + 50 + 45);
    expect(r.donation).toBe(2);
    expect(r.revenueShare).toBe(3);
    expect(r.totalPrice).toBe(295 + 2 + 3);
    expect(r.totalReagentCost).toBe(5 + 1 + 10);
    expect(r.totalOverhead).toBe(3 * DEFAULT_PRICING_CONFIG.marginalOverhead);
  });
});

describe("calculateAnalytics", () => {
  const pricing = calculatePanelPrice([anchor, addOnDiscount, addOnFloor]);

  it("computes overhead per panel and a positive gross margin", () => {
    const r = calculateAnalytics(pricing, {
      currentDailyOverhead: 1000,
      currentPanelsPerDay: 10,
      futureDailyOverhead: 800,
      futurePanelsPerDay: 20,
    });
    expect(r.currentOverheadPerPanel).toBe(100);
    expect(r.futureOverheadPerPanel).toBe(40);
    expect(r.currentTotalCost).toBe(16 + 100);
    expect(r.currentGrossMargin).toBe(300 - 116);
    expect(r.currentProfitable).toBe(true);
  });

  it("treats zero panels per day as zero overhead per panel", () => {
    const r = calculateAnalytics(pricing, {
      currentDailyOverhead: 1000,
      currentPanelsPerDay: 0,
      futureDailyOverhead: 1000,
      futurePanelsPerDay: 0,
    });
    expect(r.currentOverheadPerPanel).toBe(0);
    expect(r.futureOverheadPerPanel).toBe(0);
  });

  it("flags an unprofitable panel when costs exceed the price", () => {
    const r = calculateAnalytics(pricing, {
      currentDailyOverhead: 100000,
      currentPanelsPerDay: 1,
      futureDailyOverhead: 100000,
      futurePanelsPerDay: 1,
    });
    expect(r.currentGrossMargin).toBeLessThan(0);
    expect(r.currentProfitable).toBe(false);
  });
});
