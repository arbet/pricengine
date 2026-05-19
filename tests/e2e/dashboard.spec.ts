import { test, expect } from "@playwright/test";

test("unauthenticated visitor is redirected from a protected route to login", async ({ page }) => {
  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("security headers are present on the response", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
});
