import { expect, test } from "@playwright/test";

test("development component gallery exposes stable primitives", async ({ page }) => {
  await page.goto("/dev/components", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "Component Gallery" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Button" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Default", exact: true }).first()).toBeVisible();
});
