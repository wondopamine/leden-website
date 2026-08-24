import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  LIFECYCLE_MENU_ITEM_ID,
  LIFECYCLE_REQUIRED_OPTION_ID,
  createSignedInStaffClient,
  freshOrderIdentity,
  getLifecycleOrderByAttempt,
  loadLifecycleFixtureContext,
  recordLifecycleAttempt,
  recordLifecycleDatabaseArtifacts,
  recordLifecycleTrackingSecret,
  trackingHash,
  type LifecycleFixtureContext,
} from "../e2e/helpers/order-fixtures";

const enabled = process.env.PLAYWRIGHT_REAL_LIFECYCLE === "1";
const suite = enabled ? describe : describe.skip;

function createArgs(attemptId: string, trackingSecret: string) {
  return {
    p_idempotency_key: attemptId,
    p_tracking_token_hash: `\\x${trackingHash(trackingSecret)}`,
    p_customer_name: "Synthetic concurrency customer",
    p_customer_phone: "5145550199",
    p_locale: "en",
    p_notes: "",
    p_pickup_mode: "asap",
    p_scheduled_pickup_local: null,
    p_items: [
      {
        menu_item_id: LIFECYCLE_MENU_ITEM_ID,
        quantity: 1,
        option_ids: [LIFECYCLE_REQUIRED_OPTION_ID],
      },
    ],
  };
}

suite("real local order concurrency and authorization", () => {
  let context: LifecycleFixtureContext;
  let staffClient: Awaited<ReturnType<typeof createSignedInStaffClient>>;
  const createdOrderIds = new Set<string>();

  beforeAll(async () => {
    context = await loadLifecycleFixtureContext();
    staffClient = await createSignedInStaffClient(context);
  });

  afterAll(async () => {
    await recordLifecycleDatabaseArtifacts(context);
    for (const orderId of createdOrderIds) {
      const { error } = await context.serviceClient.rpc(
        "cleanup_lifecycle_test_order_v1",
        { p_order_id: orderId },
      );
      if (error) throw new Error("Integration order cleanup failed.");
    }
  });

  it("serializes identical creates and one competing staff transition", async () => {
    const identity = freshOrderIdentity();
    await recordLifecycleAttempt(context.runId, identity.attemptId);
    await recordLifecycleTrackingSecret(context.runId, identity.trackingSecret);
    const args = createArgs(identity.attemptId, identity.trackingSecret);

    const [first, second] = await Promise.all([
      context.serviceClient.rpc("create_order_v1", args),
      context.serviceClient.rpc("create_order_v1", args),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toEqual(second.data);

    const order = await getLifecycleOrderByAttempt(context, identity.attemptId);
    expect(order).not.toBeNull();
    createdOrderIds.add(order!.id);
    expect(order!.order_items).toHaveLength(1);
    expect(order!.order_status_events).toMatchObject([
      {
        from_status: null,
        to_status: "new",
        status_version: 0,
        actor_user_id: null,
      },
    ]);

    const [advance, cancel] = await Promise.all([
      staffClient.rpc("transition_order_status_v1", {
        p_order_id: order!.id,
        p_expected_status: "new",
        p_expected_version: 0,
        p_new_status: "preparing",
      }),
      staffClient.rpc("transition_order_status_v1", {
        p_order_id: order!.id,
        p_expected_status: "new",
        p_expected_version: 0,
        p_new_status: "cancelled",
      }),
    ]);
    const loser = [advance, cancel].find((result) => result.error);
    const winner = [advance, cancel].find((result) => result.data);
    expect(loser?.error?.message).toContain("OLH_TRANSITION_CONFLICT");
    expect(winner?.data).toBeTruthy();

    const persisted = await getLifecycleOrderByAttempt(context, identity.attemptId);
    expect(["preparing", "cancelled"]).toContain(persisted!.status);
    expect(persisted!.status_version).toBe(1);
    expect(
      [...persisted!.order_status_events]
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
        to_status: persisted!.status,
        status_version: 1,
        actor_user_id: context.staff.userId,
      },
    ]);
  });

  it("denies anonymous and unlisted identities while allowlisted staff retain access", async () => {
    const identity = freshOrderIdentity();
    await recordLifecycleAttempt(context.runId, identity.attemptId);
    await recordLifecycleTrackingSecret(context.runId, identity.trackingSecret);
    const created = await context.serviceClient.rpc(
      "create_order_v1",
      createArgs(identity.attemptId, identity.trackingSecret),
    );
    expect(created.error).toBeNull();
    const order = await getLifecycleOrderByAttempt(context, identity.attemptId);
    createdOrderIds.add(order!.id);

    const anonymous = createClient(context.supabaseUrl, context.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anonymousRead = await anonymous.from("orders").select("id");
    expect(anonymousRead.data ?? []).toEqual([]);
    const anonymousInsert = await anonymous.from("orders").insert({
      customer_name: "Synthetic bypass",
      customer_phone: "5145550100",
      subtotal: 0,
      tax_gst: 0,
      tax_qst: 0,
      total: 0,
    });
    expect(anonymousInsert.error).not.toBeNull();

    const unlistedEmail = `unlisted-${context.runId.toLowerCase()}@example.invalid`;
    const unlistedPassword = "Synthetic-unlisted-Aa1!";
    const { data: createdUser, error: createUserError } =
      await context.serviceClient.auth.admin.createUser({
        email: unlistedEmail,
        password: unlistedPassword,
        email_confirm: true,
        user_metadata: { lifecycle_run_id: context.runId, synthetic: true },
      });
    expect(createUserError).toBeNull();
    expect(createdUser.user).not.toBeNull();
    const unlisted = createClient(context.supabaseUrl, context.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signIn = await unlisted.auth.signInWithPassword({
      email: unlistedEmail,
      password: unlistedPassword,
    });
    expect(signIn.error).toBeNull();
    const unlistedRead = await unlisted.from("orders").select("id");
    expect(unlistedRead.data ?? []).toEqual([]);
    const deniedTransition = await unlisted.rpc("transition_order_status_v1", {
      p_order_id: order!.id,
      p_expected_status: "new",
      p_expected_version: 0,
      p_new_status: "preparing",
    });
    expect(deniedTransition.error?.message).toContain("OLH_ADMIN_FORBIDDEN");

    const staffRead = await staffClient
      .from("orders")
      .select("id")
      .eq("id", order!.id)
      .single();
    expect(staffRead.error).toBeNull();
    expect(staffRead.data?.id).toBe(order!.id);
  });
});
