import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createUserSchema,
  updateUserSchema,
  calculatePriceSchema,
  createPanelSchema,
  apiPricingRequestSchema,
  loginSchema,
} from "@/lib/validations/schemas";

const uuids = (n: number) => Array.from({ length: n }, () => randomUUID());

describe("createUserSchema password policy", () => {
  const base = { name: "Jane", email: "jane@example.com", role: "lab_employee" as const, orgId: randomUUID() };

  it("rejects passwords shorter than 12 characters", () => {
    expect(createUserSchema.safeParse({ ...base, password: "short123" }).success).toBe(false);
  });

  it("accepts a 12-character password", () => {
    expect(createUserSchema.safeParse({ ...base, password: "abcdefghijkl" }).success).toBe(true);
  });

  it("rejects passwords longer than 128 characters", () => {
    expect(createUserSchema.safeParse({ ...base, password: "a".repeat(129) }).success).toBe(false);
  });
});

describe("updateUserSchema password policy", () => {
  it("enforces the 12-character minimum when a password is supplied", () => {
    expect(updateUserSchema.safeParse({ id: randomUUID(), password: "tooshort" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ id: randomUUID(), password: "longenough12" }).success).toBe(true);
  });

  it("allows omitting the password entirely", () => {
    expect(updateUserSchema.safeParse({ id: randomUUID(), name: "New Name" }).success).toBe(true);
  });
});

describe("array bounds", () => {
  it("calculatePriceSchema accepts up to 100 test ids and rejects 101", () => {
    expect(calculatePriceSchema.safeParse({ testIds: uuids(100) }).success).toBe(true);
    expect(calculatePriceSchema.safeParse({ testIds: uuids(101) }).success).toBe(false);
  });

  it("calculatePriceSchema rejects an empty selection", () => {
    expect(calculatePriceSchema.safeParse({ testIds: [] }).success).toBe(false);
  });

  it("createPanelSchema caps tests at 100", () => {
    expect(createPanelSchema.safeParse({ name: "P", testIds: uuids(100) }).success).toBe(true);
    expect(createPanelSchema.safeParse({ name: "P", testIds: uuids(101) }).success).toBe(false);
  });

  it("apiPricingRequestSchema caps test_ids at 100", () => {
    expect(
      apiPricingRequestSchema.safeParse({ organization: "LCE", test_ids: Array(100).fill("T-1") }).success
    ).toBe(true);
    expect(
      apiPricingRequestSchema.safeParse({ organization: "LCE", test_ids: Array(101).fill("T-1") }).success
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password but does not impose the 12-char policy", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
