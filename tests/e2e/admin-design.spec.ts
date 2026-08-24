import { expect, test } from "@playwright/test";

test("admin login remains reachable without an authenticated session", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle("Sign in — Café Le Den Admin");
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

test("admin sign-in errors are announced from a safe mocked response", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.route("**/auth/v1/token**", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    });
  });
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });

  const email = page.getByLabel("Email");
  const password = page.getByLabel("Password");
  await expect(email).toBeEnabled();
  await email.fill("preview@example.com");
  await password.fill("not-a-real-password");
  await expect(email).toHaveValue("preview@example.com");
  await expect(password).toHaveValue("not-a-real-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.locator("main p[role='alert']")).toContainText(
    "Check your email and password, then try again.",
  );
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test.describe("explicit non-production admin preview", () => {
  test.skip(
    process.env.PLAYWRIGHT_ADMIN_PREVIEW !== "1",
    "Requires the explicit auth-free, non-mutating preview build flag.",
  );

  test("semantic headings, analytics recovery, and dirty-state confirmation work at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/dev/admin", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: "Admin redesign preview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "KDS board (OrdersDashboard)" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "A-101" }).first()).toBeVisible();

    const analyticsRecovery = page
      .getByRole("heading", { level: 2, name: "Analytics recovery state" })
      .locator("xpath=ancestor::section");
    const analyticsError = analyticsRecovery.getByRole("alert").filter({
      has: page.getByRole("heading", { level: 3, name: "Analysis unavailable" }),
    });
    await expect(analyticsError).toContainText(
      "Check your connection and try again.",
    );
    const retryAnalytics = analyticsError.getByRole("button", {
      name: "Try again",
    });
    await expect(retryAnalytics).toBeEnabled();
    await retryAnalytics.click();
    await expect(
      analyticsRecovery.getByRole("status", {
        name: "Loading order analysis",
      }),
    ).toBeVisible();
    await expect(
      analyticsRecovery.getByText("Total orders", { exact: true }),
    ).toBeVisible();
    await expect(analyticsRecovery.getByText("42", { exact: true })).toBeVisible();
    await expect(
      analyticsRecovery.getByRole("heading", {
        level: 3,
        name: "Submitted order value",
      }),
    ).toBeVisible();
    await expect(analyticsError).toBeHidden();

    await expect(page.locator('[data-slot="table-header"][data-sticky="true"]')).toBeVisible();

    await page.getByLabel("Name (EN)", { exact: true }).last().fill("Unsaved drinks");
    await page.getByLabel("Slug", { exact: true }).last().fill("unsaved-drinks");
    const discardCategories = page.getByRole("button", {
      name: "Discard unsaved changes",
    });
    await expect(discardCategories).toBeVisible();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Discard your unsaved category changes");
      await dialog.accept();
    });
    await discardCategories.click();
    await expect(page.getByLabel("Name (EN)", { exact: true }).last()).toHaveValue("");
    await expect(discardCategories).toBeHidden();

    await page.getByLabel("Address").fill("A safe, unsaved preview address");
    await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();

    const settingsSection = page
      .getByRole("heading", { level: 2, name: "Settings form" })
      .locator("xpath=ancestor::section");
    let prompt = "";
    page.once("dialog", async (dialog) => {
      prompt = dialog.message();
      await dialog.dismiss();
    });
    await settingsSection
      .getByRole("link", { name: "Cancel", exact: true })
      .click();
    expect(prompt).toContain("Discard your unsaved changes");
    await expect(page).toHaveURL(/\/dev\/admin$/);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test("orders search debounce preserves the latest filters", async ({ page }) => {
    await page.goto("/dev/admin", { waitUntil: "domcontentloaded" });

    const filterSection = page
      .getByRole("heading", { level: 2, name: "Orders filter behavior" })
      .locator("xpath=ancestor::section");
    const search = filterSection.getByRole("searchbox", {
      name: "Search orders",
    });
    const navigationCount = filterSection.getByTestId(
      "orders-filter-navigation-count",
    );
    const latestNavigation = filterSection.getByTestId(
      "orders-filter-navigation",
    );

    await expect(navigationCount).toHaveText("0");
    await search.fill("a");
    await page.waitForTimeout(350);
    await expect(navigationCount).toHaveText("0");

    await search.fill("ab");
    await page.waitForTimeout(100);
    await expect(navigationCount).toHaveText("0");
    await expect(navigationCount).toHaveText("1");
    let navigation = JSON.parse((await latestNavigation.textContent()) ?? "{}");
    expect(navigation.method).toBe("replace");
    let url = new URL(navigation.href, "https://preview.invalid");
    expect(url.searchParams.get("q")).toBe("ab");
    expect(url.searchParams.get("date")).toBe("2026-08-17");
    expect(url.searchParams.get("status")).toBe("new");

    await search.fill("");
    await expect(navigationCount).toHaveText("2");
    navigation = JSON.parse((await latestNavigation.textContent()) ?? "{}");
    expect(navigation.method).toBe("replace");
    url = new URL(navigation.href, "https://preview.invalid");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("date")).toBe("2026-08-17");
    expect(url.searchParams.get("status")).toBe("new");

    await search.fill("latte");
    await page.waitForTimeout(50);
    await filterSection.getByRole("tab", { name: "Ready" }).click();
    await page.waitForTimeout(350);
    navigation = JSON.parse((await latestNavigation.textContent()) ?? "{}");
    url = new URL(navigation.href, "https://preview.invalid");
    expect(url.searchParams.get("q")).toBe("latte");
    expect(url.searchParams.get("date")).toBe("2026-08-17");
    expect(url.searchParams.get("status")).toBe("ready");
  });

  test("newer form edits remain dirty and guarded after delayed saves", async ({
    page,
  }) => {
    await page.goto("/dev/admin", { waitUntil: "domcontentloaded" });

    const settingsSection = page
      .getByRole("heading", { level: 2, name: "Settings form" })
      .locator("xpath=ancestor::section");
    const address = settingsSection.getByLabel("Address");
    await address.fill("Submitted preview address");
    await settingsSection.getByRole("button", { name: "Save settings" }).click();
    await expect(settingsSection.getByText("Saving settings…")).toBeVisible();
    await address.fill("Newer unsaved preview address");
    await settingsSection
      .getByRole("button", { name: "Resolve delayed settings save" })
      .click();
    await expect(
      settingsSection.getByText(
        "Settings saved. Newer edits are still unsaved.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(address).toHaveValue("Newer unsaved preview address");

    let settingsPrompt = "";
    page.once("dialog", async (dialog) => {
      settingsPrompt = dialog.message();
      await dialog.dismiss();
    });
    await settingsSection
      .getByRole("link", { name: "Cancel", exact: true })
      .click();
    expect(settingsPrompt).toContain("Discard your unsaved changes");
    await expect(page).toHaveURL(/\/dev\/admin$/);

    const menuSection = page
      .getByRole("heading", { level: 2, name: "Menu item form save race" })
      .locator("xpath=ancestor::section");
    const menuName = menuSection.getByLabel("Name (English)");
    await menuName.fill("Submitted preview latte");
    await menuSection
      .getByRole("button", { name: "Save menu preview" })
      .click();
    await expect(
      menuSection.getByText("Saving menu item changes…"),
    ).toBeVisible();
    await menuName.fill("Newer unsaved preview latte");
    await menuSection
      .getByRole("button", { name: "Resolve delayed menu save" })
      .click();
    await expect(
      menuSection.getByText(
        "Menu item changes saved. Newer edits are still unsaved.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(menuName).toHaveValue("Newer unsaved preview latte");

    let menuPrompt = "";
    page.once("dialog", async (dialog) => {
      menuPrompt = dialog.message();
      await dialog.dismiss();
    });
    await menuSection
      .getByRole("link", { name: "Cancel", exact: true })
      .click();
    expect(menuPrompt).toContain("Discard your unsaved changes");
    await expect(page).toHaveURL(/\/dev\/admin$/);
  });
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
