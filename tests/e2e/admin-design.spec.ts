import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  assertSafeSupabaseMutationTarget,
  readEnvironmentSentinel,
} from "./helpers/supabase-target";

// This file may consume an ephemeral synthetic staff password. Never retain
// browser artifacts that could capture it.
test.use({ trace: "off", screenshot: "off", video: "off" });

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

    await expect(filterSection.locator("[data-preview-hydrated]"))
      .toHaveAttribute("data-preview-hydrated", "true");

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
    await expect(settingsSection.locator("[data-preview-hydrated]"))
      .toHaveAttribute("data-preview-hydrated", "true");
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

  test("the admin board reconciles canonically, degrades honestly, and protects terminal actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      let offset = 0;
      Object.defineProperty(window, "__advanceAdminClock", {
        configurable: false,
        value: (milliseconds: number) => {
          offset += milliseconds;
        },
      });
      Date.now = () => realNow() + offset;
    });
    await page.routeWebSocket(/\/realtime\/v1\/websocket/i, async (socket) => {
      await socket.close({ code: 1012, reason: "deterministic realtime loss" });
    });

    const baseOrder = {
      id: "d2000000-0000-4000-8000-000000000001",
      order_number: "A-201",
      customer_name: "Synthetic Staff Test",
      customer_phone: "514 555 0101",
      pickup_time: null,
      promised_pickup_at: "2026-08-24T16:00:00.000Z",
      status: "ready",
      status_version: 2,
      subtotal: 5,
      tax_gst: 0.25,
      tax_qst: 0.5,
      total: 5.75,
      created_at: "2026-08-24T15:00:00.000Z",
      updated_at: "2026-08-24T15:30:00.000Z",
      order_items: [
        {
          id: "e2000000-0000-4000-8000-000000000001",
          menu_item_name: "Test latte",
          price: 5,
          quantity: 1,
          modifiers: [],
        },
      ],
    };
    let orders = [baseOrder];
    let orderingEnabled = true;
    await page.route("**/api/admin/orders", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "cache-control": "private, no-store, max-age=0",
          "referrer-policy": "no-referrer",
        },
        body: JSON.stringify({
          orders,
          orderingEnabled,
          localDate: "2026-08-24",
          refreshedAt: new Date().toISOString(),
        }),
      });
    });
    const unexpectedMutations: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        unexpectedMutations.push(`${request.method()} ${request.url()}`);
      }
    });

    await page.goto("/dev/admin?ordersNetwork=1", { waitUntil: "domcontentloaded" });
    const board = page
      .getByRole("heading", { level: 2, name: "KDS board (OrdersDashboard)" })
      .locator("xpath=ancestor::section");
    const previewTransitionCount = board.getByTestId("preview-transition-count");
    await expect(previewTransitionCount).toHaveText("0");
    await expect(board.getByRole("heading", { level: 3, name: "A-201" })).toBeVisible();
    await expect(board.getByText("Test latte", { exact: false })).toBeVisible();
    await expect(board.getByTestId("admin-connection-state")).toHaveAttribute(
      "data-state",
      "polling",
    );

    orders = [
      { ...baseOrder, status: "new", status_version: 1 },
      {
        ...baseOrder,
        id: "d2000000-0000-4000-8000-000000000002",
        order_number: "A-202",
        status: "new",
        status_version: 0,
        promised_pickup_at: "2026-08-24T15:45:00.000Z",
        order_items: [
          {
            ...baseOrder.order_items[0],
            id: "e2000000-0000-4000-8000-000000000002",
            menu_item_name: "Complete inserted line",
          },
        ],
      },
    ];
    await board.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(board.getByRole("heading", { level: 3, name: "A-202" })).toHaveCount(1);
    await expect(board.getByText("Complete inserted line", { exact: false })).toBeVisible();
    await expect(board.getByRole("heading", { level: 3, name: "A-201" })).toBeVisible();
    await expect(board.getByText("Ready", { exact: true }).first()).toBeVisible();

    await page.evaluate((milliseconds) => {
      (
        window as typeof window & {
          __advanceAdminClock: (value: number) => void;
        }
      ).__advanceAdminClock(milliseconds);
    }, 46_000);
    await expect(board.getByTestId("admin-connection-state")).toHaveAttribute(
      "data-state",
      "stale",
    );
    await expect(board.getByRole("button", { name: "Mark picked up" })).toBeDisabled();

    await board.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(board.getByTestId("admin-connection-state")).toHaveAttribute(
      "data-state",
      "polling",
    );
    await expect(board.getByRole("button", { name: "Mark picked up" })).toBeEnabled();
    await board.getByRole("button", { name: "Mark picked up" }).click();
    await expect(
      page.getByRole("heading", { name: "Mark order A-201 picked up?" }),
    ).toBeVisible();
    await expect(page.getByText(/terminal action cannot be undone/i)).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm picked up" })
      .click();
    await expect(previewTransitionCount).toHaveText("1");
    await expect(page.getByRole("dialog")).toBeHidden();

    const a202Card = board
      .getByRole("heading", { level: 3, name: "A-202" })
      .locator("xpath=ancestor::div[@data-slot='card']");
    await a202Card.getByRole("button", { name: "Start preparing" }).click();
    await expect(previewTransitionCount).toHaveText("2");
    await a202Card.getByRole("button", { name: "Order actions" }).click();
    await page.getByRole("menuitem", { name: "Cancel order" }).click();
    await expect(page.getByRole("heading", { name: "Cancel order A-202?" })).toBeVisible();
    await expect(page.getByText(/Call Synthetic Staff Test at 514 555 0101/i)).toBeVisible();
    await page.getByRole("button", { name: "Keep order" }).click();

    await board.getByRole("button", { name: "Pause online orders" }).click();
    await expect(page.getByRole("heading", { name: "Pause online ordering?" })).toBeVisible();
    await expect(page.getByText(/declined in English and French/i)).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Pause online orders" })
      .click();
    await expect(board.getByText("Online ordering is paused.")).toBeVisible();

    const settingsSection = page
      .getByRole("heading", { level: 2, name: "Settings form" })
      .locator("xpath=ancestor::section");
    await settingsSection.getByRole("button", { name: "Pause online orders" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Pause online orders" })
      .click();
    await expect(
      settingsSection.getByText("Paused. Existing accepted orders are unaffected."),
    ).toBeVisible();

    orderingEnabled = false;
    orders = [];
    await board.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(board.getByText("Online ordering is paused.")).toBeVisible();
    await expect(board.getByText("No new orders", { exact: true })).toBeVisible();
    await expect(board.getByRole("alert")).toHaveCount(0);
    expect(unexpectedMutations).toEqual([]);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test("an initial order-boundary failure keeps the ordering gate unknown", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/dev/admin?ordersError=1", { waitUntil: "domcontentloaded" });
    const board = page
      .getByRole("heading", { level: 2, name: "KDS board (OrdersDashboard)" })
      .locator("xpath=ancestor::section");

    await expect(board.getByRole("alert")).toContainText("Orders unavailable");
    await expect(board.getByText("Ordering state unavailable")).toBeVisible();
    await expect(board.getByRole("button", { name: /online orders/i })).toHaveCount(0);
    await expect(board.getByText("Online ordering is paused.")).toHaveCount(0);
  });
});

test.describe("authenticated admin mutation safety", () => {
  test.describe.configure({ mode: "serial" });

  const runId = process.env.PLAYWRIGHT_LIFECYCLE_RUN_ID;
  const supabaseUrl = process.env.PLAYWRIGHT_NON_PRODUCTION_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  test.skip(
    process.env.PLAYWRIGHT_ALLOW_MUTATIONS !== "1" ||
      !runId ||
      !supabaseUrl ||
      !serviceKey,
    "Requires an exact synthetic staff fixture on the verified local target.",
  );

  test("allowlisted staff enter admin, then live revocation blocks layout and upload handler", async ({
    page,
  }) => {
    const credentialsPath = join(
      process.cwd(),
      ".lifecycle-tests",
      "runs",
      `${runId}.staff.json`,
    );
    const credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as {
      version: number;
      runId: string;
      userId: string;
      email: string;
      password: string;
    };
    expect(credentials).toMatchObject({ version: 1, runId });

    const adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const sentinel = await readEnvironmentSentinel(adminClient);
    const target = assertSafeSupabaseMutationTarget({
      supabaseUrl: supabaseUrl!,
      mutationTarget: process.env.LIFECYCLE_MUTATION_TARGET,
      sentinel,
      cleanup: { available: true, runId: runId! },
    });
    expect(target).toMatchObject({ kind: "local", projectRef: null });

    const { data: membership, error: membershipReadError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", credentials.userId)
      .single();
    expect(membershipReadError).toBeNull();
    expect(membership?.user_id).toBe(credentials.userId);

    await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Password").fill(credentials.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === "/admin");
    await expect(page).not.toHaveURL(/\/admin\/login/);

    const { data: revoked, error: revokeError } = await adminClient
      .from("admin_users")
      .delete()
      .eq("user_id", credentials.userId)
      .select("user_id");
    expect(revokeError).toBeNull();
    expect(revoked).toEqual([{ user_id: credentials.userId }]);

    await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/login\?error=access-denied$/);

    const uploadResponse = await page.request.post("/api/upload-menu-image", {
      multipart: {},
    });
    expect(uploadResponse.status()).toBe(403);
    await expect(uploadResponse.json()).resolves.toEqual({
      error: "Access denied",
    });
  });
});
