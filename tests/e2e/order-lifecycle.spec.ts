import { expect, test, type Page } from "@playwright/test";

import {
  LIFECYCLE_FOREIGN_OPTION_ID,
  assertPiiFreePublicDto,
  buildLifecycleCartItem,
  createSignedInStaffClient,
  freshOrderIdentity,
  getLifecycleOrderByAttempt,
  loadLifecycleFixtureContext,
  recordLifecycleAttempt,
  recordLifecycleDatabaseArtifacts,
  recordLifecycleTrackingSecret,
  type LifecycleFixtureContext,
} from "./helpers/order-fixtures";
import { assertSensitiveMaterialAbsent } from "./helpers/privacy-assertions";

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
  extraHTTPHeaders: {
    "cf-connecting-ip": process.env.PLAYWRIGHT_LIFECYCLE_CLIENT_IP!,
  },
});

const enabled = process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1";
const lifecycle = enabled ? test.describe : test.describe.skip;

type SubmittedOrder = {
  attemptId: string;
  trackingSecret: string;
  customer: { name: string; phone: string };
  locale: "en" | "fr";
  notes: string;
  pickup: { mode: "asap" };
  items: Array<{ menuItemId: string; quantity: number; optionIds: string[] }>;
  turnstileToken: string;
};

async function signInStaff(page: Page, context: LifecycleFixtureContext) {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(context.staff.email);
  await page.getByLabel("Password").fill(context.staff.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === "/admin");
}

async function seedCart(page: Page, locale: "en" | "fr") {
  await page.addInitScript((item) => {
    if (window.sessionStorage.getItem("__realLifecycleCartSeeded")) return;
    window.localStorage.setItem(
      "cafe-leden-cart",
      JSON.stringify({ state: { items: [item] }, version: 1 }),
    );
    window.sessionStorage.setItem("__realLifecycleCartSeeded", "1");
  }, buildLifecycleCartItem(locale));
}

async function submitCustomerOrder({
  page,
  context,
  locale,
  dropCommittedResponse,
}: {
  page: Page;
  context: LifecycleFixtureContext;
  locale: "en" | "fr";
  dropCommittedResponse: boolean;
}) {
  let submitted: SubmittedOrder | null = null;
  const observedRequests: Array<{ url: string; referrer: string }> = [];
  const browserRequestUrls: string[] = [];
  page.on("request", (request) => {
    browserRequestUrls.push(request.url());
    if (request.url().includes("/api/order")) {
      observedRequests.push({
        url: request.url(),
        referrer: request.headers().referer ?? "",
      });
    }
  });
  await seedCart(page, locale);
  await page.route(
    "**/api/order",
    async (route) => {
      submitted = route.request().postDataJSON() as SubmittedOrder;
      await recordLifecycleAttempt(context.runId, submitted.attemptId);
      await recordLifecycleTrackingSecret(
        context.runId,
        submitted.trackingSecret,
      );
      if (dropCommittedResponse) {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort("failed");
      } else {
        await route.continue();
      }
    },
    { times: 1 },
  );

  await page.goto(`/${locale}/order`, { waitUntil: "domcontentloaded" });
  const name = locale === "fr" ? "Client synthétique FR" : "Synthetic EN customer";
  const phone = "5145550199";
  await page.getByRole("textbox", { name: locale === "fr" ? "Nom" : "Name" }).fill(name);
  await page
    .getByRole("textbox", { name: locale === "fr" ? "Téléphone" : "Phone" })
    .fill(phone);
  const submit = page.getByRole("button", {
    name: locale === "fr" ? "Passer la commande" : "Place order",
  });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/order/status$`), {
    timeout: 20_000,
  });
  await expect(
    page.getByText(
      dropCommittedResponse
        ? locale === "fr"
          ? "Nous avons récupéré le reçu après l’interruption de la réponse initiale."
          : "We recovered the receipt after the original response was interrupted."
        : locale === "fr"
          ? "Votre commande acceptée est dans la file du café."
          : "Your accepted order is in the café queue.",
    ),
  ).toBeVisible();
  expect(submitted).not.toBeNull();
  const payload = submitted as unknown as SubmittedOrder;
  expect(payload.turnstileToken).toBe("XXXX.DUMMY.TOKEN.XXXX");
  assertSensitiveMaterialAbsent(page.url(), payload.trackingSecret, "active URL");
  assertSensitiveMaterialAbsent(page.url(), payload.attemptId, "active URL");
  for (const request of observedRequests) {
    assertSensitiveMaterialAbsent(
      request.url,
      payload.trackingSecret,
      "request URL",
    );
    assertSensitiveMaterialAbsent(request.url, payload.attemptId, "request URL");
    assertSensitiveMaterialAbsent(
      request.referrer,
      payload.trackingSecret,
      "request referrer",
    );
    assertSensitiveMaterialAbsent(
      request.referrer,
      payload.attemptId,
      "request referrer",
    );
  }
  const applicationOrigin = new URL(page.url()).origin;
  for (const requestUrl of browserRequestUrls) {
    const requestOrigin = new URL(requestUrl).origin;
    if (requestOrigin !== applicationOrigin) {
      throw new Error(
        "browser request origin contained prohibited sensitive material.",
      );
    }
  }
  const browserStorage = await page.evaluate(() => ({
    local: window.localStorage.getItem("cafe-leden-cart") ?? "",
    session: JSON.stringify(window.sessionStorage),
    history: JSON.stringify(window.history.state),
  }));
  assertSensitiveMaterialAbsent(browserStorage.local, name, "local storage");
  assertSensitiveMaterialAbsent(browserStorage.local, phone, "local storage");
  assertSensitiveMaterialAbsent(browserStorage.session, name, "session storage");
  assertSensitiveMaterialAbsent(browserStorage.session, phone, "session storage");
  assertSensitiveMaterialAbsent(
    browserStorage.session,
    payload.attemptId,
    "session storage",
  );
  assertSensitiveMaterialAbsent(
    browserStorage.history,
    payload.trackingSecret,
    "history state",
  );

  const recoveryResponse = await page.request.post("/api/order/recover", {
    headers: { Origin: new URL(page.url()).origin },
    data: {
      attemptId: payload.attemptId,
      trackingSecret: payload.trackingSecret,
    },
  });
  expect(recoveryResponse.status()).toBe(200);
  assertPiiFreePublicDto(await recoveryResponse.json());
  return { payload, observedRequests };
}

function orderCard(page: Page, orderNumber: string) {
  return page
    .getByRole("heading", { level: 3, name: orderNumber })
    .locator("xpath=ancestor::div[@data-slot='card']");
}

async function waitForCustomerStatus(
  page: Page,
  expectedStatus: "preparing" | "ready" | "picked_up" | "cancelled",
  expectedVersion: number,
  label: string,
) {
  const response = await page.waitForResponse(
    async (candidate) => {
      if (
        !candidate.url().endsWith("/api/order/status") ||
        candidate.request().method() !== "POST" ||
        candidate.status() !== 200
      ) {
        return false;
      }
      const value = (await candidate.json().catch(() => null)) as {
        order?: { status?: unknown; status_version?: unknown };
      } | null;
      return (
        value?.order?.status === expectedStatus &&
        value.order.status_version === expectedVersion
      );
    },
    { timeout: 20_000 },
  );
  assertPiiFreePublicDto(await response.json());
  await expect(page.getByText(label, { exact: true })).toBeVisible();
}

async function expectPersistedStatus(
  context: LifecycleFixtureContext,
  attemptId: string,
  status: "preparing" | "ready" | "picked_up" | "cancelled",
) {
  await expect
    .poll(async () => (await getLifecycleOrderByAttempt(context, attemptId))?.status, {
      timeout: 10_000,
    })
    .toBe(status);
}

async function expectTerminalTransitionDenied(
  context: LifecycleFixtureContext,
  orderId: string,
  expectedStatus: "picked_up" | "cancelled",
  expectedVersion: number,
  attemptedStatus: "preparing" | "cancelled",
) {
  const staffClient = await createSignedInStaffClient(context);
  const result = await staffClient.rpc("transition_order_status_v1", {
    p_order_id: orderId,
    p_expected_status: expectedStatus,
    p_expected_version: expectedVersion,
    p_new_status: attemptedStatus,
  });
  expect(result.data).toBeNull();
  expect(result.error?.message).toContain("OLH_TRANSITION_INVALID");
}

lifecycle("real local customer, admin, and tracking lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  let context: LifecycleFixtureContext;

  test.beforeAll(async () => {
    context = await loadLifecycleFixtureContext();
  });

  test.afterAll(async () => {
    await recordLifecycleDatabaseArtifacts(context);
  });

  test("EN dropped response recovers one order and reaches picked up without Realtime", async ({
    context: browserContext,
    page: customer,
  }) => {
    test.setTimeout(150_000);
    const admin = await browserContext.newPage();
    let releaseRealtime!: () => void;
    const realtimeGate = new Promise<void>((resolve) => {
      releaseRealtime = resolve;
    });
    let realtimeConnections = 0;
    await admin.routeWebSocket(/\/realtime\/v1\/websocket/i, async (socket) => {
      realtimeConnections += 1;
      if (realtimeConnections === 1) {
        await socket.close({
          code: 1012,
          reason: "deterministic lifecycle Realtime loss",
        });
        return;
      }
      await realtimeGate;
      socket.connectToServer();
    });
    await signInStaff(admin, context);
    await expect(admin.getByTestId("admin-connection-state")).toHaveAttribute(
      "data-state",
      "polling",
      { timeout: 15_000 },
    );

    const { payload } = await submitCustomerOrder({
      page: customer,
      context,
      locale: "en",
      dropCommittedResponse: true,
    });
    await expect
      .poll(async () => Boolean(await getLifecycleOrderByAttempt(context, payload.attemptId)))
      .toBe(true);
    const order = (await getLifecycleOrderByAttempt(
      context,
      payload.attemptId,
    ))!;
    await expect(customer.getByText(order.order_number, { exact: true })).toBeVisible();

    const replay = await customer.request.post("/api/order", {
      headers: { Origin: new URL(customer.url()).origin },
      data: payload,
    });
    expect(replay.status()).toBe(200);
    const replayDto = await replay.json();
    assertPiiFreePublicDto(replayDto);
    expect(replayDto.receipt.order_number).toBe(order.order_number);

    const changed = await customer.request.post("/api/order", {
      headers: { Origin: new URL(customer.url()).origin },
      data: {
        ...payload,
        items: [{ ...payload.items[0], quantity: 2 }],
      },
    });
    expect(changed.status()).toBe(409);
    await expect(changed.json()).resolves.toEqual({
      error: { code: "IDEMPOTENCY_CONFLICT" },
    });

    await admin.bringToFront();
    await expect(orderCard(admin, order.order_number)).toBeVisible({ timeout: 20_000 });
    releaseRealtime();
    await expect(admin.getByTestId("admin-connection-state")).toHaveAttribute(
      "data-state",
      "live",
      { timeout: 15_000 },
    );
    await expect(orderCard(admin, order.order_number)).toHaveCount(1);

    const preparingStatus = waitForCustomerStatus(
      customer,
      "preparing",
      1,
      "Being prepared",
    );
    await orderCard(admin, order.order_number)
      .getByRole("button", { name: "Start preparing" })
      .click();
    await expectPersistedStatus(context, payload.attemptId, "preparing");
    await preparingStatus;
    const readyStatus = waitForCustomerStatus(
      customer,
      "ready",
      2,
      "Ready for pickup",
    );
    await orderCard(admin, order.order_number)
      .getByRole("button", { name: "Mark ready" })
      .click();
    await expectPersistedStatus(context, payload.attemptId, "ready");
    await readyStatus;
    let statusPolls = 0;
    customer.on("request", (request) => {
      if (request.url().endsWith("/api/order/status")) statusPolls += 1;
    });
    const pickedUpStatus = waitForCustomerStatus(
      customer,
      "picked_up",
      3,
      "Picked up",
    );
    await orderCard(admin, order.order_number)
      .getByRole("button", { name: "Mark picked up" })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm picked up" })
      .click();
    await expectPersistedStatus(context, payload.attemptId, "picked_up");
    await pickedUpStatus;
    const terminalPolls = statusPolls;
    await customer.waitForTimeout(16_000);
    expect(statusPolls).toBe(terminalPolls);

    const statusResponse = await customer.request.post("/api/order/status", {
      headers: { Origin: new URL(customer.url()).origin },
      data: { trackingSecret: payload.trackingSecret },
    });
    expect(statusResponse.status()).toBe(200);
    const statusDto = await statusResponse.json();
    assertPiiFreePublicDto(statusDto);
    expect(statusDto.order).toMatchObject({
      order_number: order.order_number,
      status: "picked_up",
      status_version: 3,
    });

    const finalOrder = await getLifecycleOrderByAttempt(context, payload.attemptId);
    expect(finalOrder!.order_items).toHaveLength(1);
    expect(
      [...finalOrder!.order_status_events]
        .sort((left, right) => left.status_version - right.status_version)
        .map(({ from_status, to_status, status_version, actor_user_id }) => ({
          from_status,
          to_status,
          status_version,
          actor_user_id,
        })),
    ).toEqual([
      { from_status: null, to_status: "new", status_version: 0, actor_user_id: null },
      { from_status: "new", to_status: "preparing", status_version: 1, actor_user_id: context.staff.userId },
      { from_status: "preparing", to_status: "ready", status_version: 2, actor_user_id: context.staff.userId },
      { from_status: "ready", to_status: "picked_up", status_version: 3, actor_user_id: context.staff.userId },
    ]);

    await expectTerminalTransitionDenied(
      context,
      finalOrder!.id,
      "picked_up",
      3,
      "cancelled",
    );
    const immutableOrder = await getLifecycleOrderByAttempt(
      context,
      payload.attemptId,
    );
    expect(immutableOrder).toMatchObject({
      status: "picked_up",
      status_version: 3,
    });
    expect(immutableOrder!.order_status_events).toHaveLength(4);
  });

  test("FR response recovery cancels terminally and tampered modifier ownership leaves no partial order", async ({
    context: browserContext,
    page: customer,
  }) => {
    test.setTimeout(90_000);
    const admin = await browserContext.newPage();
    await signInStaff(admin, context);
    const { payload } = await submitCustomerOrder({
      page: customer,
      context,
      locale: "fr",
      dropCommittedResponse: true,
    });
    await expect
      .poll(async () => Boolean(await getLifecycleOrderByAttempt(context, payload.attemptId)))
      .toBe(true);
    const persisted = (await getLifecycleOrderByAttempt(
      context,
      payload.attemptId,
    ))!;

    await admin.bringToFront();
    await expect(orderCard(admin, persisted.order_number)).toBeVisible({ timeout: 20_000 });
    const card = orderCard(admin, persisted.order_number);
    await card.getByRole("button", { name: "Order actions" }).click();
    await admin.getByRole("menuitem", { name: "Cancel order" }).click();
    await expect(admin.getByText(/Call Client synthétique FR at 5145550199/)).toBeVisible();
    const cancelledStatus = waitForCustomerStatus(
      customer,
      "cancelled",
      1,
      "Annulée",
    );
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel order" })
      .click();
    await expectPersistedStatus(context, payload.attemptId, "cancelled");
    await cancelledStatus;

    const terminal = await getLifecycleOrderByAttempt(context, payload.attemptId);
    expect(terminal!.status).toBe("cancelled");
    expect(terminal!.status_version).toBe(1);
    expect(
      [...terminal!.order_status_events]
        .sort((left, right) => left.status_version - right.status_version)
        .map(({ from_status, to_status, status_version, actor_user_id }) => ({
          from_status,
          to_status,
          status_version,
          actor_user_id,
        })),
    ).toEqual([
      {
        from_status: null,
        to_status: "new",
        status_version: 0,
        actor_user_id: null,
      },
      {
        from_status: "new",
        to_status: "cancelled",
        status_version: 1,
        actor_user_id: context.staff.userId,
      },
    ]);
    await expectTerminalTransitionDenied(
      context,
      terminal!.id,
      "cancelled",
      1,
      "preparing",
    );
    const immutableOrder = await getLifecycleOrderByAttempt(
      context,
      payload.attemptId,
    );
    expect(immutableOrder).toMatchObject({
      status: "cancelled",
      status_version: 1,
    });
    expect(immutableOrder!.order_status_events).toHaveLength(2);

    const invalid = freshOrderIdentity();
    await recordLifecycleAttempt(context.runId, invalid.attemptId);
    await recordLifecycleTrackingSecret(context.runId, invalid.trackingSecret);
    const tampered = await customer.request.post("/api/order", {
      headers: { Origin: new URL(customer.url()).origin },
      data: {
        ...payload,
        attemptId: invalid.attemptId,
        trackingSecret: invalid.trackingSecret,
        items: [{ ...payload.items[0], optionIds: [LIFECYCLE_FOREIGN_OPTION_ID] }],
      },
    });
    expect(tampered.status()).toBe(409);
    await expect(tampered.json()).resolves.toEqual({ error: { code: "MENU_CHANGED" } });
    expect(await getLifecycleOrderByAttempt(context, invalid.attemptId)).toBeNull();
  });
});
