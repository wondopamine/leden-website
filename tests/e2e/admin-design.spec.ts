import { expect, test } from "@playwright/test";

test("admin login remains reachable without an authenticated session", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Café Le Den", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Café Le Den" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Email")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
  await expect(page.getByLabel("Password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  await expect(page.getByLabel("Password")).toHaveAttribute("required", "");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();

  const touchTargets = await page
    .locator('input:not([type="hidden"]), button[type="submit"]')
    .evaluateAll((elements) =>
      elements.map((element) => ({
        height: element.getBoundingClientRect().height,
        width: element.getBoundingClientRect().width,
      })),
    );
  expect(touchTargets.every(({ height, width }) => height >= 44 && width >= 44)).toBe(
    true,
  );

  await page.getByLabel("Email").focus();
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("admin login shell reflows without overflow at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Café Le Den" })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(1);

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
