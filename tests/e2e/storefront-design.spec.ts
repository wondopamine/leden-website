import { expect, test, type Page } from "@playwright/test";

const locales = [
  {
    locale: "en",
    menuTitle: "Our Menu",
    emptyCart: "Your cart is empty",
    confirmationTitle: "Order Placed!",
    skipLabel: "Skip to content",
    languageLabel: "Language: English",
    alternateLanguage: "Français",
    addLabel: "Add",
    closeLabel: "Close",
    addToOrder: /Add to Order/,
    placeOrder: "Place Order",
    nameLabel: "Name",
    phoneLabel: "Phone",
    homeLabel: "Home",
  },
  {
    locale: "fr",
    menuTitle: "Notre menu",
    emptyCart: "Votre panier est vide",
    confirmationTitle: "Commande envoyée!",
    skipLabel: "Aller au contenu",
    languageLabel: "Langue: Français",
    alternateLanguage: "English",
    addLabel: "Ajouter",
    closeLabel: "Fermer",
    addToOrder: /Ajouter à la commande/,
    placeOrder: "Passer la commande",
    nameLabel: "Nom",
    phoneLabel: "Téléphone",
    homeLabel: "Accueil",
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
      await expect(page.locator('img[src*="story-coffee"]')).toBeVisible();
      await expect(page.getByText("121 Donegani, Pointe-Claire, QC", { exact: true }).first()).toBeVisible();
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

for (const {
  locale,
  languageLabel,
  alternateLanguage,
  addLabel,
  closeLabel,
  addToOrder,
  placeOrder,
  nameLabel,
  phoneLabel,
  homeLabel,
} of locales) {
  test(`${locale} menu controls and checkout errors keep their accessible contract`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });

    const languageTrigger = page.getByRole("button", { name: languageLabel });
    await languageTrigger.click();
    await expect(page.getByRole("menuitem", { name: alternateLanguage })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(languageTrigger).toBeFocused();
    await languageTrigger.click();
    await page.getByRole("menuitem", { name: alternateLanguage }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale === "en" ? "fr" : "en"}/menu$`));
    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });

    const sheetTrigger = page.getByRole("button", { name: "Menu", exact: true });
    await sheetTrigger.click();
    await expect(page.getByRole("button", { name: homeLabel, exact: true })).toBeVisible();
    await page.getByRole("button", { name: closeLabel }).click();
    await expect(page.getByRole("button", { name: homeLabel, exact: true })).toBeHidden();

    const categories = page.locator('main [role="group"] button');
    await expect(categories.first()).toHaveAttribute("aria-pressed", "true");
    await categories.nth(1).click();
    await expect(categories.nth(1)).toHaveAttribute("aria-pressed", "true");
    await categories.first().click();

    const firstItem = page.locator("main button:has(h3)").first();
    const itemName = (await firstItem.locator("h3").textContent())?.trim();
    expect(itemName).toBeTruthy();
    await firstItem.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: `${addLabel} ${itemName}` }).click();
    await expect(dialog.locator('[aria-live="polite"]')).toHaveText("2");
    await dialog.getByRole("button", { name: closeLabel }).click();
    await expect(dialog).toBeHidden();

    await firstItem.click();
    await page.getByRole("button", { name: addToOrder }).click();
    await expect(dialog).toBeHidden();

    await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
    const placeOrderButton = page.getByRole("button", { name: placeOrder });
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    const nameInput = page.getByRole("textbox", { name: nameLabel });
    const phoneInput = page.getByRole("textbox", { name: phoneLabel });
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(nameInput).toHaveAttribute("aria-errormessage", "name-requirement");
    await expect(page.locator("#name-requirement")).toHaveAttribute("role", "alert");
    await expect(phoneInput).toHaveAttribute("aria-invalid", "true");
    await expect(phoneInput).toHaveAttribute("aria-errormessage", "phone-requirement");
    await expect(page.locator("#phone-requirement")).toHaveAttribute("role", "alert");
    await expect(placeOrderButton).toHaveAttribute("aria-busy", "false");
    await expectNoHorizontalPageOverflow(page);
  });
}
