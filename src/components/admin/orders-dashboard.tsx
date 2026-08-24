"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrderCard, type Order } from "./order-card";
import {
  ORDER_STATUS,
  KDS_COLUMNS,
  ORDER_TERMINAL,
  type OrderStatus,
} from "@/components/admin/status";
import { setOnlineOrderingEnabled } from "@/app/admin/(dashboard)/actions";
import {
  ADMIN_STALE_AFTER_MS,
  canTransitionOrders,
  getAdminConnectionState,
  getAdminPollInterval,
  parseAdminOrdersSnapshot,
  reconcileAdminOrders,
  shouldApplyAdminSnapshot,
  sortAdminOrders,
  type AdminConnectionState,
  type AdminOrder,
  type AdminTransportState,
} from "@/lib/orders/admin-realtime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BellRing, BellOff, RefreshCw, Wifi, WifiOff } from "lucide-react";

type Props = {
  initialOrders: Order[];
  initialRefreshedAt?: string | null;
  initialOrderingEnabled?: boolean | null;
  initialError?: boolean;
  networkEnabled?: boolean;
  orderingAction?: OrderingAction;
  reconcileOrderingMutation?: boolean;
  transitionAction?: TransitionAction;
};

type OrderingAction = typeof setOnlineOrderingEnabled;
type TransitionAction = NonNullable<
  React.ComponentProps<typeof OrderCard>["action"]
>;

const COLUMN_EMPTY_STATE: Record<
  string,
  { title: string; description: string }
> = {
  new: {
    title: "No new orders",
    description: "Incoming pickup orders will appear here.",
  },
  preparing: {
    title: "Nothing in preparation",
    description: "Orders move here after preparation starts.",
  },
  ready: {
    title: "Nothing ready",
    description: "Orders waiting for handoff will appear here.",
  },
};

const CONNECTION_COPY: Record<
  AdminConnectionState,
  { label: string; description: string }
> = {
  live: {
    label: "Live",
    description: "Realtime hints are connected and the queue is fresh.",
  },
  reconnecting: {
    label: "Reconnecting",
    description: "Last-known orders are visible. Wait for reconciliation before acting.",
  },
  polling: {
    label: "Polling",
    description: "Realtime is unavailable. The canonical queue is being polled.",
  },
  stale: {
    label: "Stale",
    description: "The queue has not refreshed recently. Refresh before acting.",
  },
};

function normalizeInitialOrder(order: Order): AdminOrder {
  return {
    ...order,
    promised_pickup_at: order.promised_pickup_at ?? order.pickup_time,
    status_version: order.status_version ?? 0,
    updated_at: order.updated_at ?? order.created_at,
  };
}

function formatRefreshTime(value: string | null): string {
  if (!value) return "No successful refresh";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "No successful refresh";
  return `Last refreshed ${parsed.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

export function OrdersDashboard({
  initialOrders,
  initialRefreshedAt = null,
  initialOrderingEnabled = null,
  initialError = false,
  networkEnabled = true,
  orderingAction = setOnlineOrderingEnabled,
  reconcileOrderingMutation = true,
  transitionAction,
}: Props) {
  const [orders, setOrders] = useState<AdminOrder[]>(() =>
    sortAdminOrders(initialOrders.map(normalizeInitialOrder)),
  );
  const ordersRef = useRef(orders);
  const [transport, setTransport] = useState<AdminTransportState>("reconnecting");
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<number | null>(() => {
    if (initialError || !initialRefreshedAt) return null;
    const parsed = Date.parse(initialRefreshedAt);
    return Number.isFinite(parsed) ? Date.now() : null;
  });
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(
    initialError ? null : initialRefreshedAt,
  );
  const [orderingEnabled, setOrderingEnabled] = useState(initialOrderingEnabled);
  const [showInitialError, setShowInitialError] = useState(initialError);
  const [refreshError, setRefreshError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestSequenceRef = useRef(0);
  const appliedSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const hasCanonicalRefreshRef = useRef(!initialError);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const connectionState = getAdminConnectionState(
    transport,
    lastSuccessfulAt,
    now,
  );
  const transitionsEnabled = canTransitionOrders(connectionState);

  const playNewOrderCue = useCallback((newOrders: AdminOrder[]) => {
    if (newOrders.length === 0) return;
    const first = newOrders[0];
    toast.success(
      newOrders.length === 1
        ? `New order: ${first.order_number}`
        : `${newOrders.length} new orders`,
      {
        description:
          newOrders.length === 1
            ? `${first.customer_name} · canonical queue refreshed`
            : "The canonical queue has been refreshed.",
      },
    );
    if (!soundEnabledRef.current) return;
    try {
      const context = audioContextRef.current;
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.23);
    } catch {
      // The visible notification remains the primary signal.
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Admin refresh failed.");
      const snapshot = parseAdminOrdersSnapshot(await response.json());
      if (
        !mountedRef.current ||
        !shouldApplyAdminSnapshot(appliedSequenceRef.current, requestSequence)
      ) {
        return false;
      }
      appliedSequenceRef.current = requestSequence;
      const existingIds = new Set(ordersRef.current.map((order) => order.id));
      const newlyVisible = snapshot.orders.filter(
        (order) => !existingIds.has(order.id) && !ORDER_TERMINAL.includes(order.status),
      );
      setOrders((current) => reconcileAdminOrders(current, snapshot.orders));
      setOrderingEnabled(snapshot.orderingEnabled);
      setLastSuccessfulAt(Date.now());
      setLastRefreshedAt(snapshot.refreshedAt);
      setShowInitialError(false);
      setRefreshError(false);
      if (hasCanonicalRefreshRef.current) playNewOrderCue(newlyVisible);
      hasCanonicalRefreshRef.current = true;
      return true;
    } catch {
      if (
        mountedRef.current &&
        shouldApplyAdminSnapshot(appliedSequenceRef.current, requestSequence)
      ) {
        setRefreshError(true);
      }
      return false;
    } finally {
      if (mountedRef.current && requestSequence === requestSequenceRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [playNewOrderCue]);

  const toggleSound = useCallback(async () => {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      await audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
      return;
    }
    try {
      const context = new AudioContext();
      await context.resume();
      audioContextRef.current = context;
      soundEnabledRef.current = true;
      setSoundEnabled(true);
    } catch {
      toast.error("Sound could not be enabled", {
        description: "Visible new-order alerts remain active.",
      });
    }
  }, []);

  useEffect(() => {
    if (!networkEnabled) {
      setTransport("polling");
      return;
    }
    let supabase: ReturnType<typeof createClient> | undefined;
    let channel:
      | ReturnType<ReturnType<typeof createClient>["channel"]>
      | undefined;
    setTransport("reconnecting");
    try {
      supabase = createClient();
      channel = supabase
        .channel("admin-orders-reconciliation")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            void refreshOrders();
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setTransport("live");
            void refreshOrders();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setTransport("polling");
            void refreshOrders();
          } else {
            setTransport("reconnecting");
          }
        });
    } catch {
      setTransport("polling");
    }
    void refreshOrders();
    return () => {
      try {
        if (channel) void supabase?.removeChannel(channel);
      } catch {
        // The polling boundary remains independent of Realtime cleanup.
      }
    };
  }, [networkEnabled, refreshOrders]);

  useEffect(() => {
    if (!networkEnabled) return;
    const reconcileWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshOrders();
    };
    const reconcileOnFocus = () => void refreshOrders();
    const reconcileOnline = () => {
      setTransport("reconnecting");
      void refreshOrders();
    };
    const markOffline = () => setTransport("polling");
    document.addEventListener("visibilitychange", reconcileWhenVisible);
    window.addEventListener("focus", reconcileOnFocus);
    window.addEventListener("online", reconcileOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      document.removeEventListener("visibilitychange", reconcileWhenVisible);
      window.removeEventListener("focus", reconcileOnFocus);
      window.removeEventListener("online", reconcileOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, [networkEnabled, refreshOrders]);

  useEffect(() => {
    if (!networkEnabled) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshOrders();
    }, getAdminPollInterval(connectionState));
    return () => window.clearInterval(interval);
  }, [connectionState, networkEnabled, refreshOrders]);

  const byStatus = useCallback(
    (status: OrderStatus) => orders.filter((order) => order.status === status),
    [orders],
  );
  const terminalOrders = useMemo(
    () => ORDER_TERMINAL.flatMap((status) => byStatus(status)),
    [byStatus],
  );
  const pickedUpCount = byStatus("picked_up").length;
  const cancelledCount = byStatus("cancelled").length;
  const connection = CONNECTION_COPY[connectionState];

  return (
    <div className="space-y-4">
      <section
        aria-label="Order board controls"
        className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            data-testid="admin-connection-state"
            data-state={connectionState}
            className={cn(
              connectionState === "live" &&
                "border-status-ready-border bg-status-ready-surface text-status-ready-foreground",
              connectionState === "stale" &&
                "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {connectionState === "live" ? (
              <Wifi aria-hidden="true" data-icon="inline-start" />
            ) : (
              <WifiOff aria-hidden="true" data-icon="inline-start" />
            )}
            {connection.label}
          </Badge>
          <p className="text-caption text-muted-foreground" aria-live="polite">
            {connection.description} {formatRefreshTime(lastRefreshedAt)}.
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refreshOrders()}
              disabled={isRefreshing}
              aria-busy={isRefreshing}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn("size-4", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={soundEnabled}
              onClick={() => void toggleSound()}
            >
              {soundEnabled ? (
                <BellRing aria-hidden="true" className="size-4" />
              ) : (
                <BellOff aria-hidden="true" className="size-4" />
              )}
              {soundEnabled ? "Sound on" : "Enable sound"}
            </Button>
          </div>
        </div>

        {orderingEnabled === null ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-semibold text-foreground">
              Ordering state unavailable
            </p>
            <p className="text-caption text-muted-foreground">
              Refresh the canonical queue before pausing or resuming online orders.
            </p>
          </div>
        ) : (
          <OnlineOrderingControl
            enabled={orderingEnabled}
            action={orderingAction}
            onChanged={(enabled) => {
              setOrderingEnabled(enabled);
              if (reconcileOrderingMutation) void refreshOrders();
            }}
          />
        )}
      </section>

      {(showInitialError || refreshError) && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-foreground">
            {showInitialError ? "Orders unavailable" : "Refresh unsuccessful"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showInitialError
              ? "The queue could not be loaded. Refresh before accepting or changing an order."
              : "Last-known orders remain visible. Check the connection and refresh again."}
          </p>
        </div>
      )}

      {orderingEnabled === false && (
        <div role="status" className="rounded-xl border border-status-progress-border bg-status-progress-surface p-3 text-sm text-status-progress-foreground">
          <strong>Online ordering is paused.</strong> Existing orders stay in the
          queue and can still be completed.
        </div>
      )}

      {connectionState === "stale" && orders.length > 0 && (
        <p className="text-sm font-medium text-destructive" role="status">
          Last-known queue — transition controls are locked until a canonical refresh succeeds.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {KDS_COLUMNS.map((status) => (
          <KdsColumn
            key={status}
            status={status}
            orders={byStatus(status)}
            transitionsDisabled={!transitionsEnabled}
            onReconcile={refreshOrders}
            transitionAction={transitionAction}
            emptyState={COLUMN_EMPTY_STATE[status] ?? {
              title: "No orders",
              description: "Orders in this state will appear here.",
            }}
          />
        ))}
      </div>

      {terminalOrders.length > 0 && (
        <section className="space-y-3 border-t border-border pt-4">
          <h2 className="font-sans text-sm font-semibold text-foreground">
            Recently picked up ({pickedUpCount}) / cancelled ({cancelledCount})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {terminalOrders.map((order) => (
              <OrderCard key={order.id} order={order} action={transitionAction} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function OnlineOrderingControl({
  enabled: initialEnabled,
  onChanged,
  action = setOnlineOrderingEnabled,
}: {
  enabled: boolean;
  onChanged?: (enabled: boolean) => void;
  action?: OrderingAction;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const nextEnabled = !enabled;

  useEffect(() => setEnabled(initialEnabled), [initialEnabled]);

  function confirmChange() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await action(nextEnabled);
        if (!result.ok) {
          toast.error("Online ordering was not changed", {
            description: "Check the connection, then try again.",
          });
          return;
        }
        setEnabled(result.enabled);
        setConfirmOpen(false);
        onChanged?.(result.enabled);
        toast.success(
          result.enabled ? "Online ordering resumed" : "Online ordering paused",
        );
      } catch {
        toast.error("Online ordering was not changed", {
          description: "Check the connection, then try again.",
        });
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Accepting online orders
        </p>
        <p className="text-caption text-muted-foreground">
          {enabled
            ? "New customer orders can be accepted."
            : "Paused. Existing accepted orders are unaffected."}
        </p>
      </div>
      <Button
        type="button"
        variant={enabled ? "outline" : "default"}
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        aria-busy={isPending}
      >
        {enabled ? "Pause online orders" : "Resume online orders"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sans">
              {nextEnabled ? "Resume online ordering?" : "Pause online ordering?"}
            </DialogTitle>
            <DialogDescription>
              {nextEnabled
                ? "Customers will be able to submit new pickup orders again."
                : "New checkout attempts will be declined in English and French. Existing accepted orders remain in the staff queue."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="default" />}>
              Keep current setting
            </DialogClose>
            <Button
              type="button"
              variant={nextEnabled ? "default" : "destructive"}
              onClick={confirmChange}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending
                ? "Saving…"
                : nextEnabled
                  ? "Resume online orders"
                  : "Pause online orders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KdsColumn({
  status,
  orders,
  emptyState,
  transitionsDisabled,
  onReconcile,
  transitionAction,
}: {
  status: OrderStatus;
  orders: AdminOrder[];
  emptyState: { title: string; description: string };
  transitionsDisabled: boolean;
  onReconcile: () => Promise<boolean>;
  transitionAction?: TransitionAction;
}) {
  const meta = ORDER_STATUS[status];
  const StatusIcon = meta.icon;
  const headingId = `orders-${status}-heading`;

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", meta.dot)} />
        <StatusIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        <h2 id={headingId} className="font-sans text-sm font-semibold text-foreground">
          {meta.label}
        </h2>
        <span
          aria-label={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
          className="ml-auto rounded-full bg-muted px-2 py-0.5 text-caption font-semibold tabular-nums text-foreground"
        >
          {orders.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
            <p className="mt-1 text-caption text-muted-foreground">
              {emptyState.description}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              transitionsDisabled={transitionsDisabled}
              onReconcile={onReconcile}
              action={transitionAction}
            />
          ))
        )}
      </div>
    </section>
  );
}

export { ADMIN_STALE_AFTER_MS };
