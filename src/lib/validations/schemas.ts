import { z } from "zod";

// --- Test CRUD ---
export const createTestSchema = z.object({
  testId: z.string().min(1, "Test ID is required"),
  name: z.string().min(1, "Test name is required"),
  reagentCost: z.number().min(0, "Reagent cost must be non-negative"),
  listPrice: z.number().min(0, "List price must be non-negative"),
  category: z.string().optional(),
});

export const updateTestSchema = createTestSchema.extend({
  id: z.string().uuid(),
});

// --- Excel Upload Row ---
export const excelTestRowSchema = z.object({
  testId: z.string().min(1, "Test ID is required"),
  name: z.string().min(1, "Test name is required"),
  reagentCost: z.number().min(0, "Reagent cost must be non-negative"),
  listPrice: z.number().min(0, "List price must be non-negative"),
  category: z.string().optional().default(""),
});

// --- Panel Operations ---
export const createPanelSchema = z.object({
  name: z.string().min(1, "Panel name is required"),
  testIds: z.array(z.string().uuid()).min(1, "At least one test is required"),
});

export const updatePanelSchema = createPanelSchema.extend({
  id: z.string().uuid(),
});

// --- Calculator Submission ---
export const calculatePriceSchema = z.object({
  testIds: z.array(z.string().uuid()).min(1, "Select at least one test"),
});

// --- Analytics Inputs ---
export const analyticsInputSchema = z.object({
  panelId: z.string().uuid(),
  currentDailyOverhead: z.number().min(0),
  currentPanelsPerDay: z.number().min(0),
  futureDailyOverhead: z.number().min(0),
  futurePanelsPerDay: z.number().min(0),
});

export const overheadSettingsSchema = z.object({
  overheadCost: z.number().min(0).nullable(),
  panelsPerDay: z.number().int().min(0).nullable(),
  futureOverheadCost: z.number().min(0).nullable(),
  futurePanelsPerDay: z.number().int().min(0).nullable(),
});

// --- Organization Management ---
export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  code: z.string().min(1, "Code is required").max(10),
  contactEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const updateOrgSchema = createOrgSchema.extend({
  id: z.string().uuid(),
});

// --- User Management ---
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["lab_manager", "lab_employee"]),
  orgId: z.string().uuid(),
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["lab_manager", "lab_employee"]).optional(),
});

// --- External API Request ---
export const apiPricingRequestSchema = z.object({
  organization: z.string().min(1, "Organization identifier is required"),
  test_ids: z.array(z.string()).min(1, "test_ids must be a non-empty array"),
});

// --- Login ---
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});
