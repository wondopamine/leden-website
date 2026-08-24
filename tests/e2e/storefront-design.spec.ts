import { expect, test, type Page } from "@playwright/test";

const locales = [
  {
    locale: "en",
    homeTitle: "Café Le Den — Café in Pointe-Claire",
    menuPageTitle: "Menu for pickup | Café Le Den",
    orderPageTitle: "Order for pickup | Café Le Den",
    confirmationPageTitle: "Order confirmation | Café Le Den",
    menuTitle: "Our menu",
    emptyCart: "Your cart is empty",
    confirmationTitle: "Order placed",
    skipLabel: "Skip to content",
    languageLabel: "Language: English",
    currentLanguage: "English",
    alternateLanguage: "Français",
    orderForPickup: "Order for pickup",
    reviewsTitle: "What our guests say",
    addLabel: "Add",
    closeLabel: "Close",
    addToOrder: /Add to order/,
    placeOrder: "Place order",
    submitError: "We couldn’t place your order. Your cart is saved. Check your connection and try again.",
    nameLabel: "Name",
    phoneLabel: "Phone",
    homeLabel: "Home",
    removeLabel: "Remove",
    undoLabel: "Undo",
    removedMessage: (item: string) => `${item} removed from your order`,
  },
  {
    locale: "fr",
    homeTitle: "Café Le Den — Café à Pointe-Claire",
    menuPageTitle: "Menu pour cueillette | Café Le Den",
    orderPageTitle: "Commander pour cueillette | Café Le Den",
    confirmationPageTitle: "Confirmation de commande | Café Le Den",
    menuTitle: "Notre menu",
    emptyCart: "Votre panier est vide",
    confirmationTitle: "Commande envoyée",
    skipLabel: "Aller au contenu",
    languageLabel: "Langue: Français",
    currentLanguage: "Français",
    alternateLanguage: "English",
    orderForPickup: "Commander pour cueillette",
    reviewsTitle: "Ce que disent nos clients",
    addLabel: "Ajouter",
    closeLabel: "Fermer",
    addToOrder: /Ajouter à la commande/,
    placeOrder: "Passer la commande",
    submitError: "Nous n’avons pas pu passer votre commande. Votre panier est conservé. Vérifiez votre connexion et réessayez.",
    nameLabel: "Nom",
    phoneLabel: "Téléphone",
    homeLabel: "Accueil",
    removeLabel: "Retirer",
    undoLabel: "Annuler",
    removedMessage: (item: string) => `${item} a été retiré de votre commande`,
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

async function expectMinimumTouchTarget(locator: ReturnType<Page["locator"]>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

for (const { locale, skipLabel, homeTitle, orderForPickup, reviewsTitle } of locales) {
  for (const viewport of viewports) {
    test(`${locale} home preserves the ${viewport.name} shell`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });

      await expect(page).toHaveTitle(homeTitle);
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

      const hero = page
        .getByRole("heading", { level: 1, name: "Café Le Den" })
        .locator("xpath=ancestor::section");
      const heroPickup = hero.getByRole("link", { name: orderForPickup });
      await expect(heroPickup).toHaveClass(/bg-primary/);
      await expect(heroPickup).not.toHaveClass(/bg-accent/);

      if (viewport.name === "phone") {
        const stickyPickup = page.locator(".fixed").getByRole("link", { name: orderForPickup });
        await expect(stickyPickup).toHaveClass(/bg-primary/);
        await expect(stickyPickup).not.toHaveClass(/bg-accent/);

        const footerNavigation = page.getByRole("navigation", { name: "Footer" });
        await footerNavigation.scrollIntoViewIfNeeded();
        for (const footerLink of await footerNavigation.getByRole("link").all()) {
          await expectMinimumTouchTarget(footerLink);
        }

        const reviewsSection = page
          .getByRole("heading", { level: 2, name: reviewsTitle })
          .locator("xpath=ancestor::section");
        await expectMinimumTouchTarget(reviewsSection.getByRole("link", { name: /Google/ }));
      }
    });
  }
}

for (const {
  locale,
  menuTitle,
  menuPageTitle,
  emptyCart,
  orderPageTitle,
  confirmationTitle,
  confirmationPageTitle,
} of locales) {
  test(`${locale} public order route states remain reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });

    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(menuPageTitle);
    await expect(page.getByRole("heading", { level: 1, name: menuTitle })).toBeVisible();
    await expectNoHorizontalPageOverflow(page);

    await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(orderPageTitle);
    await expect(page.getByRole("heading", { name: emptyCart })).toBeVisible();

    await page.goto(`/${locale}/order/confirmation`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(confirmationPageTitle);
    await expect(page.getByRole("heading", { name: confirmationTitle })).toBeVisible();
  });
}

for (const {
  locale,
  emptyCart,
  confirmationTitle,
  placeOrder,
  removeLabel,
  undoLabel,
  removedMessage,
} of locales) {
  test(`${locale} checkout serializes totals and clears the cart after a mocked success`, async ({
    page,
  }) => {
    const orderNumber = "E2E-SAFE-101";
    const item = {
      id: "e2e-cart-line",
      menuItemId: "e2e-oat-latte",
      name: "Oat Latte",
      nameEn: "Oat Latte",
      nameFr: "Latte à l’avoine",
      price: 5.25,
      quantity: 2,
      modifiers: [
        { name: "Milk", option: "Oat", priceAdjustment: 0.75 },
      ],
      image: "/images/menu/latte.jpg",
    };
    const customerInfo = {
      name: "E2E Customer",
      phone: "5145550199",
    };
    const removedItem = {
      id: "e2e-removed-line",
      menuItemId: "e2e-blueberry-scone",
      name: "Blueberry Scone",
      nameEn: "Blueberry Scone",
      nameFr: "Scone aux bleuets",
      price: 4,
      quantity: 1,
      modifiers: [],
      image: "/images/menu/scone.jpg",
    };
    const subtotal = 12;
    const gst = subtotal * 0.05;
    const qst = subtotal * 0.09975;
    const total = subtotal + gst + qst;
    let submittedPayload: unknown;

    await page.setViewportSize({ width: 320, height: 760 });
    await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
    await page.addInitScript(
      ({ persistedItem, removedItem: persistedRemovedItem, persistedCustomer }) => {
        if (window.sessionStorage.getItem("cafe-leden-e2e-cart-seeded")) {
          return;
        }
        window.localStorage.setItem(
          "cafe-leden-cart",
          JSON.stringify({
            state: {
              items: [persistedItem, persistedRemovedItem],
              customerInfo: persistedCustomer,
              pickupTime: null,
            },
            version: 0,
          }),
        );
        window.sessionStorage.setItem("cafe-leden-e2e-cart-seeded", "true");
      },
      {
        persistedItem: item,
        removedItem,
        persistedCustomer: customerInfo,
      },
    );
    await page.route("**/api/order", async (route) => {
      expect(route.request().method()).toBe("POST");
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderNumber }),
      });
    });

    await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
    const removedItemName =
      locale === "fr" ? removedItem.nameFr : removedItem.nameEn;
    await page
      .getByRole("button", {
        name: `${removeLabel} ${removedItemName}`,
      })
      .last()
      .click();
    const removalToast = page.getByText(removedMessage(removedItemName), {
      exact: true,
    });
    await expect(removalToast).toBeVisible();
    await expect(
      page.getByRole("button", { name: undoLabel, exact: true }),
    ).toBeVisible();

    const summary = page
      .getByRole("heading", { level: 2, name: "Total" })
      .locator("xpath=parent::div");
    await expect(
      summary.getByText(locale === "fr" ? "Sous-total" : "Subtotal", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(summary.getByText("$12.00", { exact: true })).toBeVisible();
    await expect(summary.getByText("GST (5%)", { exact: true })).toBeVisible();
    await expect(summary.getByText("$0.60", { exact: true })).toBeVisible();
    await expect(summary.getByText("QST (9.975%)", { exact: true })).toBeVisible();
    await expect(summary.getByText("$1.20", { exact: true })).toBeVisible();
    await expect(summary.getByText("$13.80", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: placeOrder }).click();

    await expect(page).toHaveURL(
      new RegExp(`/${locale}/order/confirmation\\?order=${orderNumber}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: confirmationTitle }),
    ).toBeVisible();
    await expect(
      page.getByText(locale === "fr" ? "Numéro de commande" : "Order number", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
    await expect(removalToast).toBeHidden();
    await expect(
      page.getByRole("button", { name: undoLabel, exact: true }),
    ).toBeHidden();
    expect(submittedPayload).toEqual({
      items: [
        {
          name: locale === "fr" ? item.nameFr : item.nameEn,
          price: item.price,
          quantity: item.quantity,
          modifiers: item.modifiers,
          menuItemId: item.menuItemId,
        },
      ],
      customerInfo,
      pickupTime: null,
      locale,
      total,
    });

    const storedCart = await page.evaluate(() => {
      const value = window.localStorage.getItem("cafe-leden-cart");
      return value ? JSON.parse(value).state : null;
    });
    expect(storedCart).toMatchObject({
      items: [],
      customerInfo: { name: "", phone: "" },
      pickupTime: null,
    });

    await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: emptyCart })).toBeVisible();
  });
}

for (const {
  locale,
  languageLabel,
  currentLanguage,
  alternateLanguage,
  addLabel,
  closeLabel,
  addToOrder,
  placeOrder,
  submitError,
  nameLabel,
  phoneLabel,
  homeLabel,
  removeLabel,
  undoLabel,
  removedMessage,
} of locales) {
  test(`${locale} menu controls and checkout errors keep their accessible contract`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });

    const languageTrigger = page.getByRole("button", { name: languageLabel });
    await languageTrigger.click();
    const currentLanguageItem = page.getByRole("menuitemradio", { name: currentLanguage });
    const alternateLanguageItem = page.getByRole("menuitemradio", { name: alternateLanguage });
    await expect(currentLanguageItem).toHaveAttribute("aria-checked", "true");
    await expect(alternateLanguageItem).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("Escape");
    await expect(languageTrigger).toBeFocused();
    await languageTrigger.click();
    await page.getByRole("menuitemradio", { name: alternateLanguage }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale === "en" ? "fr" : "en"}/menu$`));
    await page.goto(`/${locale}/menu`, { waitUntil: "domcontentloaded" });

    const sheetTrigger = page.getByRole("button", { name: "Menu", exact: true });
    await sheetTrigger.click();
    const mobileSheet = page.getByRole("dialog");
    await expect(mobileSheet.getByRole("link", { name: homeLabel, exact: true })).toBeVisible();
    await page.getByRole("button", { name: closeLabel }).click();
    await expect(mobileSheet).toBeHidden();

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
    await page
      .getByRole("button", { name: `${removeLabel} ${itemName}` })
      .last()
      .click();
    await expect(page.getByText(removedMessage(itemName ?? ""), { exact: true })).toBeVisible();
    await page.getByRole("button", { name: undoLabel, exact: true }).click();
    await expect(page.getByText(itemName ?? "", { exact: true }).first()).toBeVisible();

    const placeOrderButton = page.getByRole("button", { name: placeOrder });
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    const nameInput = page.getByRole("textbox", { name: nameLabel });
    const phoneInput = page.getByRole("textbox", { name: phoneLabel });
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(nameInput).toHaveAttribute("aria-errormessage", "name-requirement");
    await expect(page.locator("#name-requirement")).not.toHaveAttribute("role", "alert");
    await expect(phoneInput).toHaveAttribute("aria-invalid", "true");
    await expect(phoneInput).toHaveAttribute("aria-errormessage", "phone-requirement");
    await expect(page.locator("#phone-requirement")).not.toHaveAttribute("role", "alert");
    await expect(placeOrderButton).toHaveAttribute("aria-busy", "false");

    await nameInput.fill("Test customer");
    await phoneInput.fill("5145550100");
    await page.route("**/api/order", async (route) => {
      expect(route.request().method()).toBe("POST");
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "SERVER TEXT MUST NOT BE RENDERED",
        }),
      });
    });
    await placeOrderButton.click();

    const submitErrorSummary = page.locator("#submit-error");
    await expect(submitErrorSummary).toContainText(submitError);
    await expect(submitErrorSummary).not.toContainText("SERVER TEXT MUST NOT BE RENDERED");
    await expect(submitErrorSummary).toBeFocused();
    await expect(placeOrderButton).toHaveAttribute("aria-describedby", "payment-note submit-error");
    await expect(page.getByText(itemName ?? "", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
  });
}
