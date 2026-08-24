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
    confirmationTitle: "This confirmation link has expired",
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
    confirmationTitle: "Ce lien de confirmation a expiré",
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

async function openLanguageMenu(page: Page, triggerName: string) {
  const trigger = page.getByRole("button", { name: triggerName });

  await expect
    .poll(
      async () => {
        if ((await trigger.getAttribute("aria-expanded")) !== "true") {
          await trigger.click();
        }
        return trigger.getAttribute("aria-expanded");
      },
      { timeout: 10_000 },
    )
    .toBe("true");

  return trigger;
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

test("confirmed-not-found enables only a fresh same-attempt retry", async ({ page }) => {
  const item = {
    id: "retry-line",
    menuItemId: "77777777-7777-4777-8777-777777777777",
    name: "Croissant",
    nameEn: "Croissant",
    nameFr: "Croissant",
    price: 4,
    quantity: 1,
    modifiers: [],
  };
  const receipt = {
    receipt_id: "receipt-retry-safe",
    order_number: "E2E-SAFE-RETRY",
    status: "new",
    status_version: 1,
    promised_pickup_at: "2026-08-17T14:30:00.000Z",
    subtotal: 4,
    tax_gst: 0.2,
    tax_qst: 0.4,
    total: 4.6,
    gst_rate: 0.05,
    qst_rate: 0.09975,
    created_at: "2026-08-17T14:00:00.000Z",
    items: [],
  };
  const createBodies: Array<{ attemptId: string; trackingSecret: string }> = [];
  await page.setViewportSize({ width: 320, height: 760 });
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript((persistedItem) => {
    window.localStorage.setItem(
      "cafe-leden-cart",
      JSON.stringify({ state: { items: [persistedItem] }, version: 1 }),
    );
  }, item);
  await page.route("**/api/order", async (route) => {
    createBodies.push(route.request().postDataJSON());
    if (createBodies.length === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "RECEIPT_UNCERTAIN" } }),
      });
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ receipt }),
    });
  });
  await page.route("**/api/order/recover", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }),
    });
  });
  await page.route("**/api/order/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          order_number: receipt.order_number,
          status: "new",
          status_version: 1,
          promised_pickup_at: receipt.promised_pickup_at,
          updated_at: receipt.created_at,
          cafe: { address: null, phone: "(514) 000-0000" },
        },
      }),
    });
  });

  await page.goto("/en/order", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Name" }).fill("Retry Customer");
  await page.getByRole("textbox", { name: "Phone" }).fill("5145550101");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page.getByText("No accepted order was found")).toBeVisible();
  await expect(page.getByRole("button", { name: "Place order" })).toBeDisabled();
  await page
    .getByRole("button", { name: "Verify and retry the same order" })
    .click();
  await expect(page.getByRole("button", { name: "Place order" })).toBeEnabled();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/en\/order\/status$/);

  expect(createBodies).toHaveLength(2);
  expect(createBodies[1].attemptId).toBe(createBodies[0].attemptId);
  expect(createBodies[1].trackingSecret).toBe(createBodies[0].trackingSecret);
});

test("still-uncertain never enables a duplicate submission", async ({ page }) => {
  const item = {
    id: "uncertain-line",
    menuItemId: "88888888-8888-4888-8888-888888888888",
    name: "Soupe",
    nameEn: "Soup",
    nameFr: "Soupe",
    price: 8,
    quantity: 1,
    modifiers: [],
  };
  let createCalls = 0;
  await page.setViewportSize({ width: 320, height: 760 });
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript((persistedItem) => {
    window.localStorage.setItem(
      "cafe-leden-cart",
      JSON.stringify({ state: { items: [persistedItem] }, version: 1 }),
    );
  }, item);
  await page.route("**/api/order", async (route) => {
    createCalls += 1;
    await route.abort("failed");
  });
  await page.route("**/api/order/recover", async (route) => {
    await route.abort("failed");
  });

  await page.goto("/fr/order", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Nom" }).fill("Client incertain");
  await page.getByRole("textbox", { name: "Téléphone" }).fill("5145550102");
  await page.getByRole("button", { name: "Passer la commande" }).click();

  await expect(
    page.getByText("Nous ne pouvons toujours pas confirmer le reçu"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Passer la commande" })).toBeDisabled();
  await expect(page.getByRole("link", { name: /Appeler le café/ })).toHaveCount(0);
  await expect(page.getByText(/\(514\) 000-0000/)).toHaveCount(0);
  expect(createCalls).toBe(1);
  await page.evaluate(() => {
    const persisted = JSON.parse(
      window.localStorage.getItem("cafe-leden-cart") ?? "{}",
    );
    persisted.state.items[0].quantity = 2;
    window.localStorage.setItem("cafe-leden-cart", JSON.stringify(persisted));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Nous ne pouvons toujours pas confirmer le reçu"),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nom" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Passer la commande" })).toBeDisabled();
  expect(createCalls).toBe(1);
  await expectNoHorizontalPageOverflow(page);
});

test("accepted checkout remains non-resubmittable when private session storage fails", async ({
  page,
}) => {
  const item = {
    id: "storage-failure-line",
    menuItemId: "11111111-1111-4111-8111-111111111111",
    name: "Oat Latte",
    nameEn: "Oat Latte",
    nameFr: "Latté à l’avoine",
    price: 5.25,
    quantity: 1,
    modifiers: [],
  };
  let createCalls = 0;
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript((persistedItem) => {
    if (!window.sessionStorage.getItem("__storageFailureCartSeeded")) {
      window.localStorage.setItem(
        "cafe-leden-cart",
        JSON.stringify({ state: { items: [persistedItem] }, version: 1 }),
      );
      window.sessionStorage.setItem("__storageFailureCartSeeded", "1");
    }
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (
        this === window.sessionStorage &&
        key.startsWith("cafe-leden-order-status")
      ) {
        throw new DOMException("blocked for test", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };
  }, item);
  await page.route("**/api/order", async (route) => {
    createCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        receipt: {
          receipt_id: "receipt-storage-failure",
          order_number: "SAFE-STORAGE-1",
          status: "new",
          status_version: 1,
          promised_pickup_at: "2026-08-17T14:30:00.000Z",
          subtotal: 5.25,
          tax_gst: 0.26,
          tax_qst: 0.52,
          total: 6.03,
          gst_rate: 0.05,
          qst_rate: 0.09975,
          created_at: "2026-08-17T14:00:00.000Z",
          items: [],
        },
      }),
    });
  });
  await page.route("**/api/order/recover", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        receipt: {
          receipt_id: "receipt-storage-failure",
          order_number: "SAFE-STORAGE-1",
          status: "new",
          status_version: 1,
          promised_pickup_at: "2026-08-17T14:30:00.000Z",
          subtotal: 5.25,
          tax_gst: 0.26,
          tax_qst: 0.52,
          total: 6.03,
          gst_rate: 0.05,
          qst_rate: 0.09975,
          created_at: "2026-08-17T14:00:00.000Z",
          items: [],
        },
      }),
    });
  });

  await page.goto("/en/order", { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Name" }).fill("Storage Test");
  await page.getByRole("textbox", { name: "Phone" }).fill("5145550199");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByText("Your order was accepted", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/SAFE-STORAGE-1/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Place order" })).toBeDisabled();
  expect(createCalls).toBe(1);
  const persistedCart = await page.evaluate(
    () => window.localStorage.getItem("cafe-leden-cart") ?? "",
  );
  expect(JSON.parse(persistedCart).state.items).toHaveLength(1);
  await page.evaluate(() => {
    const persisted = JSON.parse(
      window.localStorage.getItem("cafe-leden-cart") ?? "{}",
    );
    persisted.state.items[0].quantity = 2;
    window.localStorage.setItem("cafe-leden-cart", JSON.stringify(persisted));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Your order was accepted", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Place order" })).toBeDisabled();
  expect(createCalls).toBe(1);
});

test("checkout mirrors the server input and quantity bounds", async ({ page }) => {
  let createCalls = 0;
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cafe-leden-cart",
      JSON.stringify({
        version: 1,
        state: {
          items: [
            {
              id: "over-limit-line",
              menuItemId: "11111111-1111-4111-8111-111111111111",
              name: "Oat Latte",
              nameEn: "Oat Latte",
              nameFr: "Latté à l’avoine",
              price: 5.25,
              quantity: 21,
              modifiers: [],
            },
          ],
        },
      }),
    );
  });
  await page.route("**/api/order", async (route) => {
    createCalls += 1;
    await route.abort("blockedbyclient");
  });

  await page.goto("/en/order", { waitUntil: "domcontentloaded" });
  const name = page.getByRole("textbox", { name: "Name" });
  const phone = page.getByRole("textbox", { name: "Phone" });
  await expect(name).toHaveAttribute("maxlength", "100");
  await expect(phone).toHaveAttribute("maxlength", "32");
  await name.fill("Boundary Test");
  await phone.fill("5145550199");
  await expect(
    page.getByRole("button", { name: "Add Oat Latte" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByText(/up to 50 lines, 20 of one line, and 100 items total/),
  ).toBeVisible();
  expect(createCalls).toBe(0);
});

test("checkout fails honestly when authoritative café configuration is unavailable", async ({
  page,
}) => {
  let createCalls = 0;
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cafe-leden-cart",
      JSON.stringify({
        version: 1,
        state: {
          items: [
            {
              id: "config-unavailable-line",
              menuItemId: "11111111-1111-4111-8111-111111111111",
              name: "Oat Latte",
              nameEn: "Oat Latte",
              nameFr: "Latté à l’avoine",
              price: 5.25,
              quantity: 1,
              modifiers: [],
            },
          ],
        },
      }),
    );
  });
  await page.route("**/api/order", async (route) => {
    createCalls += 1;
    await route.abort("blockedbyclient");
  });

  await page.goto("/en/order?orderConfig=unavailable", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByText("Online ordering is temporarily unavailable", {
      exact: true,
    }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /temporarily unavailable/ })).toBeDisabled();
  expect(createCalls).toBe(0);
  expect(
    await page.evaluate(
      () => JSON.parse(window.localStorage.getItem("cafe-leden-cart") ?? "{}")
        .state.items.length,
    ),
  ).toBe(1);
});

test("private status polling is visible-only, monotonic, stale-safe, and terminal", async ({
  page,
}) => {
  const trackingSecret = "ddddddddddddddddddddddddddddddddddddddddddd";
  let statusCalls = 0;
  const requestUrls: string[] = [];
  await page.setViewportSize({ width: 320, height: 760 });
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript(() => {
    (window as typeof window & { __e2eVisibility?: DocumentVisibilityState })
      .__e2eVisibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () =>
        (window as typeof window & { __e2eVisibility?: DocumentVisibilityState })
          .__e2eVisibility ?? "visible",
    });
  });
  await page.route("**/api/order/status", async (route) => {
    statusCalls += 1;
    requestUrls.push(route.request().url());
    if (statusCalls === 3) {
      await route.abort("failed");
      return;
    }
    const statusVersion = statusCalls === 1 ? 2 : statusCalls === 2 ? 1 : 3;
    const status = statusVersion === 2 ? "preparing" : statusVersion === 1 ? "new" : "picked_up";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          order_number: "E2E-SAFE-POLL",
          status,
          status_version: statusVersion,
          promised_pickup_at: "2026-08-17T14:30:00.000Z",
          updated_at: `2026-08-17T14:0${statusVersion}:00.000Z`,
          cafe: { address: null, phone: null },
        },
      }),
    });
  });

  const documentResponse = await page.goto(
    `/en/order/status#${trackingSecret}`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page).toHaveURL(/\/en\/order\/status$/);
  await expect(page.getByText("Being prepared", { exact: true })).toBeVisible();
  expect(documentResponse?.headers()["cache-control"]).toContain("no-store");
  expect(documentResponse?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(documentResponse?.headers()["content-security-policy"]).toContain(
    "connect-src 'self'",
  );

  await page.evaluate(() => {
    (window as typeof window & { __e2eVisibility?: DocumentVisibilityState })
      .__e2eVisibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(30_000);
  expect(statusCalls).toBe(1);

  await page.evaluate(() => {
    (window as typeof window & { __e2eVisibility?: DocumentVisibilityState })
      .__e2eVisibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => statusCalls).toBe(2);
  await expect(page.getByText("Being prepared", { exact: true })).toBeVisible();
  await expect(page.getByText("Received", { exact: true })).toHaveCount(0);

  await page.clock.fastForward(15_000);
  await expect.poll(() => statusCalls).toBe(3);
  await expect(page.getByText("Last known", { exact: true })).toBeVisible();
  await expect(page.getByText("Being prepared", { exact: true })).toBeVisible();

  await page.clock.fastForward(15_000);
  await expect.poll(() => statusCalls).toBe(4);
  await expect(page.getByText("Picked up", { exact: true })).toBeVisible();
  await expect(page.getByText("Complete", { exact: true })).toBeVisible();
  await page.clock.fastForward(60_000);
  expect(statusCalls).toBe(4);
  expect(requestUrls.every((url) => !url.includes(trackingSecret))).toBe(true);
});

test("an unknown private secret never renders a false accepted state", async ({
  page,
}) => {
  const trackingSecret = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  await page.route("**/api/order/status", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }),
    });
  });

  await page.goto(`/en/order/status#${trackingSecret}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Opening your private order…")).toBeVisible();
  await page.waitForTimeout(100);
  await expect(
    page.getByText("Your accepted order is in the café queue."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Private order link unavailable" }),
  ).toBeVisible();
});

test("a revoked private secret removes cached receipt data", async ({ page }) => {
  const contextId = "77777777-7777-4777-8777-777777777777";
  const trackingSecret = "fffffffffffffffffffffffffffffffffffffffffff";
  const cachedOrderNumber = "CACHED-MUST-DISAPPEAR";
  let statusCalls = 0;
  await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
  await page.addInitScript(
    ({ contextId, trackingSecret, cachedOrderNumber }) => {
      const session = {
        version: 1,
        contextId,
        trackingSecret,
        recovered: false,
        createdAt: "2026-08-17T14:00:00.000Z",
        receipt: {
          receipt_id: "cached-receipt",
          order_number: cachedOrderNumber,
          status: "new",
          status_version: 1,
          promised_pickup_at: "2026-08-17T14:30:00.000Z",
          subtotal: 12,
          tax_gst: 0.6,
          tax_qst: 1.2,
          total: 13.8,
          gst_rate: 0.05,
          qst_rate: 0.09975,
          created_at: "2026-08-17T14:00:00.000Z",
          items: [],
        },
      };
      window.sessionStorage.setItem(
        `cafe-leden-order-status-v1:${contextId}`,
        JSON.stringify(session),
      );
      window.sessionStorage.setItem(
        "cafe-leden-order-status-pending-v1",
        contextId,
      );
      window.sessionStorage.setItem(
        "cafe-leden-order-status-active-v1",
        contextId,
      );
    },
    { contextId, trackingSecret, cachedOrderNumber },
  );
  await page.route("**/api/order/status", async (route) => {
    statusCalls += 1;
    if (statusCalls === 1) {
      await route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "temporary route mismatch",
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "TRACKING_UNAVAILABLE" } }),
    });
  });

  await page.goto(`/en/order/status#${trackingSecret}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(cachedOrderNumber, { exact: true })).toBeVisible();
  await expect(page.getByText("Last known", { exact: true })).toBeVisible();
  await page.clock.fastForward(15_000);
  await expect.poll(() => statusCalls).toBe(2);
  await expect(
    page.getByRole("heading", { name: "Private order link unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(cachedOrderNumber, { exact: true })).toHaveCount(0);
});

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
  placeOrder,
  nameLabel,
  phoneLabel,
  languageLabel,
  alternateLanguage,
} of locales) {
  for (const viewport of viewports) {
    test(`${locale} ${viewport.name} recovers a dropped create response without a duplicate`, async ({
      page,
    }) => {
      const orderNumber = "E2E-SAFE-101";
      const customer = { name: "E2E Customer", phone: "5145550199" };
      const item = {
        id: "e2e-cart-line",
        menuItemId: "11111111-1111-4111-8111-111111111111",
        name: "Oat Latte",
        nameEn: "Oat Latte",
        nameFr: "Latté à l’avoine",
        price: 5.25,
        quantity: 2,
        modifiers: [
          {
            modifierId: "22222222-2222-4222-8222-222222222222",
            optionId: "33333333-3333-4333-8333-333333333333",
            name: "Milk",
            option: "Oat",
            priceAdjustment: 0.75,
          },
        ],
      };
      const receipt = {
        receipt_id: "receipt-e2e-safe",
        order_number: orderNumber,
        status: "new",
        status_version: 1,
        promised_pickup_at: "2026-08-17T14:30:00.000Z",
        subtotal: 12,
        tax_gst: 0.6,
        tax_qst: 1.2,
        total: 13.8,
        gst_rate: 0.05,
        qst_rate: 0.09975,
        created_at: "2026-08-17T14:00:00.000Z",
        items: [
          {
            name: locale === "fr" ? item.nameFr : item.nameEn,
            base_price: 5.25,
            modifier_total: 0.75,
            unit_price: 6,
            quantity: 2,
            line_total: 12,
            modifiers: [
              {
                modifier_name: locale === "fr" ? "Lait" : "Milk",
                option_name: locale === "fr" ? "Avoine" : "Oat",
                price_adjustment: 0.75,
              },
            ],
          },
        ],
      };
      let createCalls = 0;
      let submittedPayload: Record<string, unknown> | null = null;
      let recoveryPayload: Record<string, unknown> | null = null;
      const boundaryRequests: Array<{ url: string; referrer: string | undefined }> = [];

      await page.setViewportSize(viewport);
      await page.clock.install({ time: new Date("2026-08-17T14:00:00.000Z") });
      await page.addInitScript((persistedItem) => {
        if (!window.sessionStorage.getItem("__e2eCartSeeded")) {
          window.localStorage.setItem(
            "cafe-leden-cart",
            JSON.stringify({ state: { items: [persistedItem] }, version: 1 }),
          );
          window.sessionStorage.setItem("__e2eCartSeeded", "1");
        }
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              (window as typeof window & { __copiedOrderLink?: string }).__copiedOrderLink = value;
            },
          },
        });
      }, item);

      await page.route("**/api/order", async (route) => {
        createCalls += 1;
        boundaryRequests.push({
          url: route.request().url(),
          referrer: route.request().headers().referer,
        });
        submittedPayload = route.request().postDataJSON();
        await route.abort("failed");
      });
      await page.route("**/api/order/recover", async (route) => {
        boundaryRequests.push({
          url: route.request().url(),
          referrer: route.request().headers().referer,
        });
        recoveryPayload = route.request().postDataJSON();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ receipt }),
        });
      });
      await page.route("**/api/order/status", async (route) => {
        boundaryRequests.push({
          url: route.request().url(),
          referrer: route.request().headers().referer,
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            order: {
              order_number: orderNumber,
              status: "new",
              status_version: 1,
              promised_pickup_at: receipt.promised_pickup_at,
              updated_at: receipt.created_at,
              cafe: {
                address: "121 Donegani, Pointe-Claire, QC",
                phone: "(514) 000-0000",
              },
            },
          }),
        });
      });

      await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
      await page.getByRole("textbox", { name: nameLabel }).fill(customer.name);
      await page.getByRole("textbox", { name: phoneLabel }).fill(customer.phone);
      await page.evaluate(() => {
        (window as typeof window & { __checkoutDocumentMarker?: boolean })
          .__checkoutDocumentMarker = true;
      });
      const placeOrderButton = page.getByRole("button", { name: placeOrder });
      await expect(placeOrderButton).toBeEnabled();
      if (locale === "en" && viewport.name === "phone") {
        await placeOrderButton.evaluate((element) => {
          (element as HTMLButtonElement).click();
          (element as HTMLButtonElement).click();
        });
      } else {
        await placeOrderButton.click();
      }
      await expect(page.getByRole("textbox", { name: nameLabel })).toBeDisabled();
      await expect(
        page.getByText(
          locale === "fr"
            ? "Vérification de l’acceptation de votre commande"
            : "Checking whether your order was accepted",
        ),
      ).toBeVisible();

      await expect(page).toHaveURL(new RegExp(`/${locale}/order/status$`));
      expect(
        await page.evaluate(
          () =>
            (window as typeof window & { __checkoutDocumentMarker?: boolean })
              .__checkoutDocumentMarker,
        ),
      ).toBeUndefined();
      await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
      await expect(page.getByText("$13.80", { exact: true })).toBeVisible();
      await expect(page.getByText("$12.00", { exact: true })).toHaveCount(2);
      await expectNoHorizontalPageOverflow(page);

      expect(createCalls).toBe(1);
      expect(submittedPayload).not.toBeNull();
      const body = submittedPayload as unknown as {
        attemptId: string;
        trackingSecret: string;
        customer: typeof customer;
        items: Array<Record<string, unknown>>;
        turnstileToken: string;
      };
      expect(body.attemptId).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.trackingSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(body.customer).toEqual(customer);
      expect(body.items).toEqual([
        {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          optionIds: [item.modifiers[0].optionId],
        },
      ]);
      expect(body.items[0]).not.toHaveProperty("name");
      expect(body.items[0]).not.toHaveProperty("price");
      expect(body).not.toHaveProperty("total");
      expect(body).not.toHaveProperty("customerInfo");
      expect(recoveryPayload).toEqual({
        attemptId: body.attemptId,
        trackingSecret: body.trackingSecret,
      });

      const browserState = await page.evaluate(() => ({
        local: window.localStorage.getItem("cafe-leden-cart") ?? "",
        session: JSON.stringify(window.sessionStorage),
        url: window.location.href,
        history: JSON.stringify(window.history.state),
      }));
      expect(browserState.local).not.toContain(customer.name);
      expect(browserState.local).not.toContain(customer.phone);
      expect(JSON.parse(browserState.local).state.items).toEqual([]);
      expect(browserState.session).not.toContain(customer.name);
      expect(browserState.session).not.toContain(customer.phone);
      expect(browserState.session).not.toContain(body.attemptId);
      expect(browserState.url).not.toContain(body.trackingSecret);
      expect(browserState.url).not.toContain(body.attemptId);
      expect(browserState.history).not.toContain(body.trackingSecret);
      expect(browserState.history).not.toContain(body.attemptId);
      for (const request of boundaryRequests) {
        expect(request.url).not.toContain(body.trackingSecret);
        expect(request.url).not.toContain(body.attemptId);
        expect(request.referrer ?? "").not.toContain(body.trackingSecret);
        expect(request.referrer ?? "").not.toContain(body.attemptId);
      }

      const copyButton = page.getByRole("button", {
        name:
          locale === "fr"
            ? "Copier le lien privé"
            : "Copy private order link",
      });
      await expectMinimumTouchTarget(copyButton);
      await copyButton.click();
      const copiedLink = await page.evaluate(
        () =>
          (window as typeof window & { __copiedOrderLink?: string })
            .__copiedOrderLink,
      );
      expect(copiedLink).toBe(
        `${new URL(page.url()).origin}/${locale}/order/status#${body.trackingSecret}`,
      );
      expect(copiedLink).not.toContain(body.attemptId);

      await openLanguageMenu(page, languageLabel);
      await page
        .getByRole("menuitemradio", { name: alternateLanguage })
        .click();
      const nextLocale = locale === "en" ? "fr" : "en";
      await expect(page).toHaveURL(new RegExp(`/${nextLocale}/order/status$`));
      await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
      expect(page.url()).not.toContain(body.trackingSecret);
      expect(page.url()).not.toContain(body.attemptId);

      if (locale === "en" && viewport.name === "phone") {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
        expect(page.url()).not.toContain(body.trackingSecret);
        await page.goBack({ waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/en\/order$/);
        await page.goForward({ waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/fr\/order\/status$/);
        await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
        expect(page.url()).not.toContain(body.trackingSecret);
      }
    });
  }
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

    const languageTrigger = await openLanguageMenu(page, languageLabel);
    const currentLanguageItem = page.getByRole("menuitemradio", { name: currentLanguage });
    const alternateLanguageItem = page.getByRole("menuitemradio", { name: alternateLanguage });
    await expect(currentLanguageItem).toHaveAttribute("aria-checked", "true");
    await expect(alternateLanguageItem).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("Escape");
    await expect(languageTrigger).toBeFocused();
    await openLanguageMenu(page, languageLabel);
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
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            unsafeDetail: "SERVER TEXT MUST NOT BE RENDERED",
          },
        }),
      });
    });
    await placeOrderButton.click();

    const submitErrorSummary = page.locator("#submit-error");
    await expect(submitErrorSummary).toContainText(
      locale === "fr"
        ? "Les commandes sont temporairement indisponibles. Votre panier est conservé. Réessayez dans quelques minutes."
        : "Ordering is temporarily unavailable. Your cart is saved. Please try again in a few minutes.",
    );
    await expect(submitErrorSummary).not.toContainText("SERVER TEXT MUST NOT BE RENDERED");
    await expect(submitErrorSummary).toBeFocused();
    await expect(placeOrderButton).toHaveAttribute("aria-describedby", "payment-note submit-error");
    await expect(page.getByText(itemName ?? "", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
  });
}
