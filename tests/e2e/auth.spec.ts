import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill("admin@pricengine.com");
  await page.getByPlaceholder("Enter password").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("super admin can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("you@company.com").fill("admin@pricengine.com");
  await page.getByPlaceholder("Enter password").fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
