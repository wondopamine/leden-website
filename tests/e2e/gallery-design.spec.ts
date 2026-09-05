import { expect, test } from "@playwright/test";

test("development component gallery exposes stable primitives", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/dev/components", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/Component gallery/);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Component gallery" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Button" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Default", exact: true }).first()).toBeVisible();

  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Contact email")).toBeVisible();
  await expect(page.getByLabel("Default option")).toBeVisible();
  await expect(page.getByLabel("Compact option")).toBeVisible();

  for (const control of [
    page.getByLabel("Email address"),
    page.getByLabel("Contact email"),
    page.getByLabel("Default option"),
    page.getByLabel("Compact option"),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  const dropdownTrigger = page.getByRole("button", { name: "Order actions" });
  await dropdownTrigger.click();
  await expect(page.getByRole("menuitem", { name: "View details" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dropdownTrigger).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
