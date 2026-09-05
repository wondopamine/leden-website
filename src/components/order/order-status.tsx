"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  Phone,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Watermelon } from "@/components/brand/watermelon";
import { formatPrice } from "@/lib/utils/format";
import {
  isPublicOrderReceipt,
  removeOrderStatusSession,
  resolveOrderStatusSession,
  type OrderStatusSession,
} from "@/lib/orders/checkout-attempt";
import type {
  PublicOrderProjection,
  PublicOrderReceipt,
  PublicOrderStatus,
} from "@/lib/types";

const HISTORY_CONTEXT_KEY = "cafeLedenOrderStatusContext";
const TERMINAL_STATUSES = new Set<PublicOrderStatus>(["picked_up", "cancelled"]);
export const ORDER_STATUS_REQUEST_TIMEOUT_MS = 8_000;
export const ORDER_STATUS_POLL_INTERVAL_MS = 15_000;

type TrackingState = "loading" | "ready" | "unavailable" | "removed";

type OrderStatusRequestLease = {
  signal: AbortSignal;
  isCurrent: () => boolean;
  waitFor: <T>(operation: Promise<T>) => Promise<T>;
  release: () => boolean;
};

export function createOrderStatusRequestCoordinator(
  timeoutMs = ORDER_STATUS_REQUEST_TIMEOUT_MS,
) {
  let generation = 0;
  let active:
    | {
        controller: AbortController;
        generation: number;
        sessionContextId: string;
        timeout: ReturnType<typeof setTimeout>;
        deadline: Promise<never>;
        rejectDeadline: (reason?: unknown) => void;
      }
    | null = null;

  return {
    begin(sessionContextId: string): OrderStatusRequestLease | null {
      if (active?.sessionContextId === sessionContextId) return null;
      if (active) {
        clearTimeout(active.timeout);
        active.controller.abort();
        active.rejectDeadline(
          new DOMException("Order status request replaced", "AbortError"),
        );
      }
      const controller = new AbortController();
      const requestGeneration = ++generation;
      let rejectDeadline!: (reason?: unknown) => void;
      const deadline = new Promise<never>((_, reject) => {
        rejectDeadline = reject;
      });
      void deadline.catch(() => undefined);
      const timeout = setTimeout(() => {
        controller.abort();
        rejectDeadline(
          new DOMException("Order status request timed out", "TimeoutError"),
        );
      }, timeoutMs);
      active = {
        controller,
        generation: requestGeneration,
        sessionContextId,
        timeout,
        deadline,
        rejectDeadline,
      };

      return {
        signal: controller.signal,
        isCurrent: () =>
          active?.controller === controller &&
          active.generation === requestGeneration &&
          active.sessionContextId === sessionContextId,
        waitFor: <T,>(operation: Promise<T>) =>
          Promise.race([operation, deadline]),
        release: () => {
          if (
            active?.controller !== controller ||
            active.generation !== requestGeneration
          ) {
            return false;
          }
          clearTimeout(active.timeout);
          active = null;
          return true;
        },
      };
    },
    invalidate() {
      generation += 1;
      if (active) {
        clearTimeout(active.timeout);
        active.controller.abort();
        active.rejectDeadline(
          new DOMException("Order status request cancelled", "AbortError"),
        );
      }
      active = null;
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrderStatus(value: unknown): value is PublicOrderStatus {
  return (
    value === "new" ||
    value === "preparing" ||
    value === "ready" ||
    value === "picked_up" ||
    value === "cancelled"
  );
}

function parseProjection(value: unknown): PublicOrderProjection | null {
  if (!isRecord(value) || !isRecord(value.cafe)) return null;
  if (
    typeof value.order_number !== "string" ||
    !isOrderStatus(value.status) ||
    !Number.isInteger(value.status_version) ||
    typeof value.promised_pickup_at !== "string" ||
    typeof value.updated_at !== "string" ||
    (value.cafe.address !== null && typeof value.cafe.address !== "string") ||
    (value.cafe.phone !== null && typeof value.cafe.phone !== "string")
  ) {
    return null;
  }
  return value as PublicOrderProjection;
}

function isTrackingUnavailable(value: unknown): boolean {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    value.error.code === "TRACKING_UNAVAILABLE"
  );
}

function timeLabel(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function dateTimeLabel(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone: "America/Toronto",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function OrderStatus({ locale }: { locale: string }) {
  const t = useTranslations("status");
  const confirmation = useTranslations("confirmation");
  const [session, setSession] =
    useState<OrderStatusSession<PublicOrderReceipt> | null>(null);
  const [projection, setProjection] =
    useState<PublicOrderProjection | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState>("loading");
  const [stale, setStale] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [visibilityEpoch, setVisibilityEpoch] = useState(0);
  const [statusRequests] = useState(createOrderStatusRequestCoordinator);
  const latestVersionRef = useRef(0);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);

  const invalidateStatusRequest = useCallback(() => {
    statusRequests.invalidate();
  }, [statusRequests]);

  useLayoutEffect(() => {
    const historyState = isRecord(window.history.state)
      ? window.history.state
      : {};
    let resolved: {
      session: OrderStatusSession<PublicOrderReceipt>;
      consumedFragment: boolean;
    } | null = null;
    try {
      resolved = resolveOrderStatusSession<PublicOrderReceipt>(
        window.sessionStorage,
        {
          fragment: window.location.hash,
          historyContextId:
            typeof historyState[HISTORY_CONTEXT_KEY] === "string"
              ? historyState[HISTORY_CONTEXT_KEY]
              : null,
        },
      );
    } catch {
      resolved = null;
    }
    if (!resolved) {
      const safeHistoryState = { ...historyState };
      delete safeHistoryState[HISTORY_CONTEXT_KEY];
      window.history.replaceState(
        safeHistoryState,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      setTrackingState("unavailable");
      return;
    }

    window.history.replaceState(
      {
        ...historyState,
        [HISTORY_CONTEXT_KEY]: resolved.session.contextId,
      },
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    const safeSession = {
      ...resolved.session,
      receipt: isPublicOrderReceipt(resolved.session.receipt)
        ? resolved.session.receipt
        : null,
    };
    latestVersionRef.current = safeSession.receipt?.status_version ?? 0;
    setSession(safeSession);
    setTrackingState(safeSession.receipt ? "ready" : "loading");
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setVisibilityEpoch((epoch) => epoch + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const effectiveStatus = projection?.status ?? session?.receipt?.status ?? null;
  const terminal = effectiveStatus ? TERMINAL_STATUSES.has(effectiveStatus) : false;

  const pollStatus = useCallback(async () => {
    if (!session || document.visibilityState !== "visible") {
      return;
    }
    const request = statusRequests.begin(session.contextId);
    if (!request) return;
    try {
      const response = await request.waitFor(
        fetch("/api/order/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingSecret: session.trackingSecret }),
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: request.signal,
        }),
      );
      if (!request.isCurrent()) return;
      const payload = (await request.waitFor(
        response.json().catch(() => null),
      )) as unknown;
      if (!request.isCurrent()) return;
      if (response.status === 404 && isTrackingUnavailable(payload)) {
        removeOrderStatusSession(window.sessionStorage, session.contextId);
        setProjection(null);
        setSession(null);
        setStale(false);
        setTrackingState("unavailable");
        return;
      }
      const next =
        response.ok && isRecord(payload) ? parseProjection(payload.order) : null;
      if (!next) {
        setStale(true);
        if (latestVersionRef.current === 0 && !session.receipt) {
          setTrackingState("unavailable");
        }
        return;
      }
      const previousVersion = latestVersionRef.current;
      if (next.status_version < previousVersion) return;
      setStale(false);
      setLastCheckedAt(new Date().toISOString());
      setTrackingState("ready");
      if (next.status_version > previousVersion) {
        latestVersionRef.current = next.status_version;
        setAnnouncement(t("statusChanged", { status: t(`states.${next.status}`) }));
      }
      setProjection((current) => {
        if (current && next.status_version < current.status_version) return current;
        return next;
      });
    } catch {
      if (!request.isCurrent()) return;
      setStale(true);
      if (latestVersionRef.current === 0 && !session.receipt) {
        setTrackingState("unavailable");
      }
    } finally {
      request.release();
    }
  }, [session, statusRequests, t]);

  useEffect(() => {
    if (!session || terminal || document.visibilityState !== "visible") return;
    void pollStatus();
    const interval = window.setInterval(
      () => void pollStatus(),
      ORDER_STATUS_POLL_INTERVAL_MS,
    );
    return () => {
      window.clearInterval(interval);
      invalidateStatusRequest();
    };
  }, [invalidateStatusRequest, pollStatus, session, terminal, visibilityEpoch]);

  useEffect(() => {
    if (trackingState === "ready") statusHeadingRef.current?.focus();
  }, [trackingState]);

  const copyPrivateLink = async () => {
    if (!session) return;
    const link = `${window.location.origin}/${locale}/order/status#${session.trackingSecret}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3_000);
    } catch {
      setCopied(false);
    }
  };

  const removePrivateOrder = () => {
    if (!session) return;
    invalidateStatusRequest();
    removeOrderStatusSession(window.sessionStorage, session.contextId);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    setSession(null);
    setProjection(null);
    setTrackingState("removed");
  };

  const receipt = session?.receipt ?? null;
  const orderNumber = projection?.order_number ?? receipt?.order_number;
  const promisedPickup =
    projection?.promised_pickup_at ?? receipt?.promised_pickup_at;
  const cafePhone = projection?.cafe.phone ?? null;
  const cafeAddress = projection?.cafe.address ?? null;

  if (trackingState === "loading") {
    return (
      <section className="mx-auto max-w-2xl px-5 py-16 text-center" aria-busy="true">
        <RefreshCw aria-hidden className="mx-auto size-8 animate-spin text-primary" />
        <h1 className="mt-4 font-display text-h2 text-forest-12">
          {t("loading")}
        </h1>
      </section>
    );
  }

  if (trackingState === "unavailable" || trackingState === "removed") {
    return (
      <section className="mx-auto max-w-lg px-5 py-16 text-center">
        <CircleAlert aria-hidden className="mx-auto size-12 text-accent-text" />
        <h1 className="mt-5 font-display text-h2 text-forest-12">
          {trackingState === "removed" ? t("removedTitle") : t("unavailableTitle")}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          {trackingState === "removed" ? t("removedBody") : t("unavailableBody")}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="flex size-16 items-center justify-center rounded-full bg-forest-9 text-cream-1">
            <Check aria-hidden className="size-8" strokeWidth={2.5} />
          </span>
          <Watermelon
            size={40}
            className="absolute -right-4 -top-3 rotate-[18deg]"
          />
        </div>
        <h1
          ref={statusHeadingRef}
          tabIndex={-1}
          className="mt-5 rounded-sm font-display text-h1 text-forest-12 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {receipt ? confirmation("title") : t("title")}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          {session?.recovered ? t("recoveredReceipt") : t("acceptedTruth")}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
          <Field label={confirmation("orderNumber")}>
            <span className="text-body font-bold tabular-nums text-foreground">
              {orderNumber ?? "—"}
            </span>
          </Field>
          <Field label={confirmation("pickupTime")}>
            <span className="text-body font-semibold text-forest-12">
              {promisedPickup ? timeLabel(promisedPickup, locale) : "—"}
            </span>
          </Field>
        </div>

        {receipt && receipt.items.length > 0 && (
          <>
            <Separator className="my-5" />
            <p className="mb-2 text-caption font-semibold text-muted-foreground">
              {confirmation("items")}
            </p>
            <div className="space-y-2">
              {receipt.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex justify-between gap-3 text-caption"
                >
                  <span className="min-w-0 text-forest-12">
                    {item.quantity}× {item.name}
                    {item.modifiers.length > 0 && (
                      <span className="text-muted-foreground">
                        {" "}(
                        {item.modifiers
                          .map((modifier) => modifier.option_name)
                          .join(", ")}
                        )
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-forest-12">
                    {formatPrice(item.line_total)}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-5" />
            <div className="space-y-1 text-caption">
              <SummaryRow
                label={confirmation("subtotal")}
                value={formatPrice(receipt.subtotal)}
                muted
              />
              <SummaryRow label="GST" value={formatPrice(receipt.tax_gst)} muted />
              <SummaryRow label="QST" value={formatPrice(receipt.tax_qst)} muted />
              <div className="flex justify-between pt-1 text-body font-bold text-forest-12">
                <span>{confirmation("total")}</span>
                <span className="tabular-nums">{formatPrice(receipt.total)}</span>
              </div>
            </div>
            <p className="mt-4 text-caption text-muted-foreground">
              {confirmation("paymentNote")}
            </p>
          </>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold text-muted-foreground">
              {t("liveStatus")}
            </p>
            <p className="mt-1 font-display text-h3 text-forest-12">
              {effectiveStatus ? t(`states.${effectiveStatus}`) : t("checking")}
            </p>
          </div>
          {stale ? (
            <span className="rounded-full bg-accent-surface px-3 py-1 text-caption font-semibold text-accent-text">
              {t("stale")}
            </span>
          ) : (
            <span className="rounded-full bg-forest-3 px-3 py-1 text-caption font-semibold text-forest-11">
              {terminal ? t("complete") : t("fresh")}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2 text-caption text-muted-foreground">
          <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            {stale
              ? t("staleLastKnown")
              : lastCheckedAt
                ? t("checkedAt", { time: dateTimeLabel(lastCheckedAt, locale) })
                : t("checking")}
          </p>
        </div>
        <p className="mt-3 text-caption text-muted-foreground">
          {t("pullOnly")}
        </p>
        {effectiveStatus === "cancelled" && cafePhone && (
          <a
            href={`tel:${cafePhone.replace(/[^+\d]/g, "")}`}
            className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-caption font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Phone aria-hidden className="size-4" />
            {t("cancelledCall", { phone: cafePhone })}
          </a>
        )}
        {cafeAddress && (
          <p className="mt-3 text-caption text-muted-foreground">
            {confirmation("pickupAt")}: {cafeAddress}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-primary/30 bg-forest-2 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold text-forest-12">{t("saveLinkTitle")}</h2>
            <p className="mt-1 text-caption text-muted-foreground">
              {t("saveLinkBody")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-4 min-h-11 w-full whitespace-normal text-center"
          onClick={copyPrivateLink}
        >
          {copied ? (
            <CheckCircle2 aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>
        <p className="mt-3 text-caption text-muted-foreground">
          {t("phoneCancellation")}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="mx-auto mt-6 min-h-11 max-w-full whitespace-normal text-center text-muted-foreground"
        onClick={removePrivateOrder}
      >
        <Trash2 aria-hidden className="size-4" />
        {t("remove")}
      </Button>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-caption font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        muted ? "text-muted-foreground" : "text-forest-12"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
