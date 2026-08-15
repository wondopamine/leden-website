import { expect, test, type Page } from "@playwright/test";

const locales = [
  {
    locale: "en",
    menuTitle: "Our Menu",
    emptyCart: "Your cart is empty",
    confirmationTitle: "Order Placed!",
    skipLabel: "Skip to content",
  },
  {
    locale: "fr",
    menuTitle: "Notre menu",
    emptyCart: "Votre panier est vide",
    confirmationTitle: "Commande envoyée!",
    skipLabel: "Aller au contenu",
  },
] as const;

const viewports = [
  { name: "phone", width: 320, height: 760 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

async function expectNoHorizontalPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

for (const { locale, skipLabel } of locales) {
  for (const viewport of viewports) {
    test(`${locale} home preserves the ${viewport.name} shell`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1, name: "Café Le Den" })).toBeVisible();
      await expect(page.locator("main#main")).toBeVisible();
      await expectNoHorizontalPageOverflow(page);

      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: skipLabel })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("main#main")).toBeFocused();
    });
  }
}

for (const { locale, menuTitle, emptyCart, confirmationTitle } of locales) {
  test(`${locale} public order route states remain reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });

    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: menuTitle })).toBeVisible();
    await expectNoHorizontalPageOverflow(page);

    await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: emptyCart })).toBeVisible();

    await page.goto(`/${locale}/order/confirmation`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: confirmationTitle })).toBeVisible();
  });
}
