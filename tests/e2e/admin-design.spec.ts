import { expect, test } from "@playwright/test";

test("admin login remains reachable without an authenticated session", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Café Le Den", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test.describe("authenticated admin mutation safety", () => {
  test.skip(
    process.env.PLAYWRIGHT_ALLOW_MUTATIONS !== "1" ||
      !process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL,
    "Requires an explicit seeded local/non-production Supabase target; production mutations are forbidden.",
  );

  test("safe-target mutation suite is intentionally fixture-gated", async () => {
    expect(process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL).toMatch(/^https?:\/\//);
    expect(process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL).not.toBe(
      process.env.PRODUCTION_SUPABASE_URL,
    );
  });
});
