"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CircleAlert,
  Clock,
  Minus,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/lib/cart-store";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Watermelon } from "@/components/brand/watermelon";
import { formatPrice } from "@/lib/utils/format";
import {
  getCafeMinutes,
  getCafeWeekday,
  getOpenStatus,
  formatTime,
} from "@/lib/hours";
import {
  CheckoutRecoveryRequiredError,
  allowCheckoutRetry,
  clearCheckoutAttempt,
  ensureCheckoutAttempt,
  getCheckoutRecoveryAttempt,
  recoverCheckoutAttempt,
  requireCheckoutRecovery,
  runCheckoutSubmission,
  saveOrderStatusSession,
  type CheckoutMaterial,
} from "@/lib/orders/checkout-attempt";
import type { CafeInfo, PublicOrderReceipt } from "@/lib/types";

type Props = {
  locale: string;
  cafeInfo: CafeInfo | null;
  recoveryPhone: string | null;
};

type CheckoutPhase =
  | "idle"
  | "submitting"
  | "checking"
  | "confirmed-not-found"
  | "still-uncertain"
  | "accepted-tracking-unavailable"
  | "error";

type ChallengeState =
  | "loading"
  | "checking"
  | "interactive"
  | "ready"
  | "expired"
  | "unavailable";

type SubmitError = {
  translationKey:
    | "errorSubmitting"
    | "errorService"
    | "errorHours"
    | "errorMenuChanged"
    | "errorChallenge"
    | "errorInputLimits"
    | "errorRateLimited";
  showMenuLink: boolean;
};

type TurnstileWidget = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
  }
}

function generateTimeSlots(cafeInfo: CafeInfo): string[] {
  const today = cafeInfo.hours.find((hour) => hour.day === getCafeWeekday());
  if (!today || today.closed) return [];

  const leadTime = cafeInfo.pickupLeadTime || 15;
  const [openHour, openMinute] = today.open.split(":").map(Number);
  const [closeHour, closeMinute] = today.close.split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const earliestMinutes = Math.max(
    Math.ceil((getCafeMinutes() + leadTime) / 15) * 15,
    openMinutes,
  );

  const slots: string[] = [];
  for (let minutes = earliestMinutes; minutes < closeMinutes; minutes += 15) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(
      `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`,
    );
  }
  return slots.slice(0, 8);
}

function cafeLocalDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function mapSubmitError(code: string): SubmitError {
  if (code === "PICKUP_INVALID" || code === "CAFE_CLOSED") {
    return { translationKey: "errorHours", showMenuLink: false };
  }
  if (code === "MENU_CHANGED" || code === "CLIENT_REFRESH_REQUIRED") {
    return { translationKey: "errorMenuChanged", showMenuLink: true };
  }
  if (code === "CHALLENGE_FAILED" || code === "CHALLENGE_UNAVAILABLE") {
    return { translationKey: "errorChallenge", showMenuLink: false };
  }
  if (code === "RATE_LIMITED") {
    return { translationKey: "errorRateLimited", showMenuLink: false };
  }
  if (code === "INVALID_REQUEST" || code === "PAYLOAD_TOO_LARGE") {
    return { translationKey: "errorInputLimits", showMenuLink: false };
  }
  if (
    code === "ORDERING_UNAVAILABLE" ||
    code === "ORDERING_PAUSED" ||
    code === "DEPENDENCY_UNAVAILABLE"
  ) {
    return { translationKey: "errorService", showMenuLink: false };
  }
  return { translationKey: "errorSubmitting", showMenuLink: false };
}

export function OrderContent({ locale, cafeInfo, recoveryPhone }: Props) {
  const t = useTranslations("order");
  const common = useTranslations("common");
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTax = useCartStore((state) => state.getTax);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [error, setError] = useState<SubmitError | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [challengeState, setChallengeState] =
    useState<ChallengeState>("loading");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeGeneration, setChallengeGeneration] = useState(0);
  const [acceptedFallback, setAcceptedFallback] =
    useState<PublicOrderReceipt | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const recoverySummaryRef = useRef<HTMLDivElement>(null);
  const challengeRegionRef = useRef<HTMLDivElement>(null);
  const removalToastIdsRef = useRef<Set<string | number>>(new Set());
  const cartGenerationRef = useRef(0);
  const clearedAttemptsRef = useRef(new Set<string>());
  const submissionInFlightRef = useRef(false);
  const recoveryStartedRef = useRef(false);

  const invalidateRemovalUndos = useCallback(() => {
    cartGenerationRef.current += 1;
    for (const toastId of removalToastIdsRef.current) toast.dismiss(toastId);
    removalToastIdsRef.current.clear();
  }, []);

  const requestFreshChallenge = useCallback(() => {
    setChallengeToken(null);
    setChallengeState("loading");
    setChallengeGeneration((generation) => generation + 1);
  }, []);

  const openStatus = cafeInfo ? getOpenStatus(cafeInfo.hours) : null;
  const cafeOpen = openStatus?.isOpen ?? false;
  const timeSlots = cafeInfo ? generateTimeSlots(cafeInfo) : [];
  const nameInvalid = attempted && !customer.name.trim();
  const phoneInvalid =
    attempted &&
    (customer.phone.replace(/\D/g, "").length < 7 ||
      customer.phone.replace(/\D/g, "").length > 15 ||
      customer.phone.trim().length > 32);
  const busy = phase === "submitting" || phase === "checking";
  const submissionLocked =
    phase === "still-uncertain" ||
    phase === "accepted-tracking-unavailable" ||
    busy;
  const materialLocked = submissionLocked || phase === "confirmed-not-found";

  useEffect(() => {
    if (error) errorSummaryRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (
      phase === "checking" ||
      phase === "confirmed-not-found" ||
      phase === "still-uncertain" ||
      phase === "accepted-tracking-unavailable"
    ) {
      recoverySummaryRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    const pending = getCheckoutRecoveryAttempt();
    if (!pending || recoveryStartedRef.current) return;
    recoveryStartedRef.current = true;
    submissionInFlightRef.current = true;
    queueMicrotask(() => setPhase("checking"));

    void recoverCheckoutAttempt<PublicOrderReceipt>(fetch, pending).then(
      (result) => {
        if (result.kind === "recovered") {
          try {
            saveOrderStatusSession(sessionStorage, {
              trackingSecret: pending.trackingSecret,
              receipt: result.receipt,
              recovered: true,
            });
          } catch {
            requireCheckoutRecovery(pending.attemptId, true);
            setAcceptedFallback(result.receipt);
            setPhase("accepted-tracking-unavailable");
            return;
          }
          if (!clearedAttemptsRef.current.has(pending.attemptId)) {
            clearedAttemptsRef.current.add(pending.attemptId);
            invalidateRemovalUndos();
            clearCart();
          }
          clearCheckoutAttempt(pending.attemptId);
          window.location.assign(
            new URL(
              `/${locale === "fr" ? "fr" : "en"}/order/status#${pending.trackingSecret}`,
              window.location.origin,
            ).toString(),
          );
          return;
        }

        if (
          result.kind === "confirmed-not-found" &&
          !pending.acceptanceKnown &&
          allowCheckoutRetry(pending.attemptId)
        ) {
          submissionInFlightRef.current = false;
          setPhase("confirmed-not-found");
          requestFreshChallenge();
          return;
        }
        setPhase("still-uncertain");
      },
    );
  }, [clearCart, invalidateRemovalUndos, locale, requestFreshChallenge]);

  if (items.length === 0 && phase === "idle") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-5 py-24 text-center">
        <Watermelon size={64} />
        <div>
          <h1 className="font-display text-h2 text-forest-12">
            {common("emptyCart")}
          </h1>
          <p className="mt-2 text-body text-muted-foreground">
            {locale === "fr"
              ? "Parcourez notre menu et ajoutez vos favoris."
              : "Browse our menu and add a few favourites."}
          </p>
        </div>
        <Link
          href="/menu"
          className={buttonVariants({
            variant: "default",
            size: "lg",
            className: "h-12 rounded-full px-8",
          })}
        >
          {common("viewMenu")}
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const nextOpenLabel = !openStatus || openStatus.isOpen
    ? ""
    : openStatus.isToday
      ? formatTime(openStatus.nextOpen, locale)
      : `${common(`daysShort.${openStatus.nextDay}`)} ${formatTime(
          openStatus.nextOpen,
          locale,
        )}`;

  const handleRemoveItem = (item: CartItem) => {
    const itemName = locale === "fr" ? item.nameFr : item.nameEn;
    const generation = cartGenerationRef.current;
    removeItem(item.id);
    const toastId = toast(t("removedItem", { item: itemName }), {
      action: {
        label: common("undo"),
        onClick: () => {
          removalToastIdsRef.current.delete(toastId);
          if (generation !== cartGenerationRef.current) return;
          addItem({ ...item, id: undefined } as Omit<CartItem, "id">);
        },
      },
    });
    removalToastIdsRef.current.add(toastId);
  };

  const handleSubmitOrder = async () => {
    setAttempted(true);
    setError(null);
    if (!customer.name.trim() || customer.name.trim().length > 100) {
      nameInputRef.current?.focus();
      return;
    }
    const phoneDigits = customer.phone.replace(/\D/g, "");
    if (
      phoneDigits.length < 7 ||
      phoneDigits.length > 15 ||
      customer.phone.trim().length > 32
    ) {
      phoneInputRef.current?.focus();
      return;
    }
    if (!cafeOpen) return;
    if (
      items.some((item) =>
        item.modifiers.some(
          (modifier) => !modifier.modifierId || !modifier.optionId,
        ),
      )
    ) {
      setPhase("error");
      setError({ translationKey: "errorMenuChanged", showMenuLink: true });
      return;
    }
    if (
      items.length > 50 ||
      items.some(
        (item) =>
          item.quantity < 1 ||
          item.quantity > 20 ||
          item.modifiers.length > 20,
      ) ||
      items.reduce((sum, item) => sum + item.quantity, 0) > 100
    ) {
      setPhase("error");
      setError({ translationKey: "errorInputLimits", showMenuLink: false });
      return;
    }
    if (!challengeToken) {
      setPhase("error");
      setError({ translationKey: "errorChallenge", showMenuLink: false });
      challengeRegionRef.current?.focus();
      return;
    }
    if (submissionInFlightRef.current) return;
    submissionInFlightRef.current = true;
    setPhase("submitting");

    const pickup: CheckoutMaterial["pickup"] = pickupTime
      ? {
          mode: "scheduled",
          scheduledLocal: `${cafeLocalDate()}T${pickupTime}`,
        }
      : { mode: "asap" };
    const material: CheckoutMaterial = {
      customer,
      locale: locale === "fr" ? "fr" : "en",
      pickup,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        optionIds: item.modifiers.flatMap((modifier) =>
          modifier.optionId ? [modifier.optionId] : [],
        ),
      })),
    };
    let attempt;
    try {
      attempt = await ensureCheckoutAttempt(material);
    } catch (error) {
      if (error instanceof CheckoutRecoveryRequiredError) {
        setPhase("still-uncertain");
      } else {
        submissionInFlightRef.current = false;
        setPhase("error");
        setError({ translationKey: "errorService", showMenuLink: false });
      }
      return;
    }
    if (!requireCheckoutRecovery(attempt.attemptId, false)) {
      submissionInFlightRef.current = false;
      setPhase("error");
      setError({ translationKey: "errorService", showMenuLink: false });
      return;
    }
    invalidateRemovalUndos();

    const result = await runCheckoutSubmission<PublicOrderReceipt>({
      fetcher: fetch,
      attempt,
      createBody: {
        customer,
        locale: material.locale,
        notes: "",
        pickup,
        items: material.items,
        turnstileToken: challengeToken,
      },
      onPhase: (nextPhase) => {
        if (nextPhase === "submitting") setPhase("submitting");
        if (nextPhase === "checking") setPhase("checking");
      },
    });

    if (result.kind === "accepted" || result.kind === "recovered") {
      try {
        saveOrderStatusSession(sessionStorage, {
          trackingSecret: attempt.trackingSecret,
          receipt: result.receipt,
          recovered: result.kind === "recovered",
        });
      } catch {
        requireCheckoutRecovery(attempt.attemptId, true);
        setAcceptedFallback(result.receipt);
        setPhase("accepted-tracking-unavailable");
        return;
      }
      if (!clearedAttemptsRef.current.has(attempt.attemptId)) {
        clearedAttemptsRef.current.add(attempt.attemptId);
        invalidateRemovalUndos();
        clearCart();
      }
      clearCheckoutAttempt(attempt.attemptId);
      window.location.assign(
        new URL(
          `/${material.locale}/order/status#${attempt.trackingSecret}`,
          window.location.origin,
        ).toString(),
      );
      return;
    }
    if (result.kind === "confirmed-not-found") {
      if (!allowCheckoutRetry(attempt.attemptId)) {
        setPhase("still-uncertain");
        return;
      }
      submissionInFlightRef.current = false;
      setPhase("confirmed-not-found");
      requestFreshChallenge();
      return;
    }
    if (result.kind === "still-uncertain") {
      setPhase("still-uncertain");
      return;
    }

    if (!allowCheckoutRetry(attempt.attemptId)) {
      setPhase("still-uncertain");
      return;
    }
    submissionInFlightRef.current = false;
    setPhase("error");
    const mapped = mapSubmitError(result.error.code);
    setError(mapped);
    requestFreshChallenge();
  };

  const card = "rounded-2xl border border-border bg-card";

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-10 md:pb-16">
      <h1 className="text-h1">{t("title")}</h1>

      {!cafeOpen && (
        <div
          className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-border bg-accent-surface p-4"
          role="status"
        >
          <Clock
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-accent-text"
          />
          <div>
            <p className="font-medium text-accent-text">
              {cafeInfo ? t("orderingClosed") : t("orderingUnavailable")}
            </p>
            {nextOpenLabel && (
              <p className="mt-0.5 text-caption text-accent-text">
                {t("opensAt", { time: nextOpenLabel })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7">
          <div className={card}>
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const lineTotal =
                  (item.price +
                    item.modifiers.reduce(
                      (sum, modifier) => sum + modifier.priceAdjustment,
                      0,
                    )) *
                  item.quantity;
                const itemName =
                  locale === "fr" ? item.nameFr : item.nameEn;
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 sm:flex-1">
                      <p className="font-medium text-forest-12">{itemName}</p>
                      {item.modifiers.length > 0 && (
                        <p className="mt-0.5 truncate text-caption text-muted-foreground">
                          {item.modifiers
                            .map(
                              (modifier) =>
                                `${modifier.name}: ${modifier.option}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <div className="flex items-center rounded-full border border-border">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            item.quantity === 1
                              ? handleRemoveItem(item)
                              : updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label={`${common("remove")} ${itemName}`}
                          disabled={materialLocked}
                          className="rounded-l-full rounded-r-none text-foreground"
                        >
                          <Minus aria-hidden className="size-4" />
                        </Button>
                        <span className="w-8 text-center text-caption font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          aria-label={`${common("add")} ${itemName}`}
                          disabled={
                            materialLocked ||
                            item.quantity >= 20 ||
                            cartQuantity >= 100
                          }
                          className="rounded-l-none rounded-r-full text-foreground"
                        >
                          <Plus aria-hidden className="size-4" />
                        </Button>
                      </div>
                      <span className="text-caption font-semibold tabular-nums text-forest-12 sm:w-20 sm:text-right">
                        {formatPrice(lineTotal)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item)}
                        aria-label={`${common("remove")} ${itemName}`}
                        disabled={materialLocked}
                        className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                      >
                        <X aria-hidden className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {cafeOpen && (
            <fieldset className={`${card} p-5`} disabled={materialLocked}>
              <legend className="px-1 text-caption font-semibold text-foreground">
                {t("pickupTime")}
              </legend>
              <p className="mt-2 text-caption text-muted-foreground">
                {t("pickupTimeDescription")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <TimePill
                  selected={!pickupTime}
                  onClick={() => setPickupTime(null)}
                >
                  {t("asap")}
                </TimePill>
                {timeSlots.map((time) => (
                  <TimePill
                    key={time}
                    selected={pickupTime === time}
                    onClick={() => setPickupTime(time)}
                  >
                    {formatTime(time, locale)}
                  </TimePill>
                ))}
              </div>
            </fieldset>
          )}

          {cafeOpen && (
            <div className={`${card} p-5`}>
              <h2 className="text-caption font-semibold text-foreground">
                {t("customerInfo")}
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">{common("name")} *</Label>
                  <Input
                    id="name"
                    ref={nameInputRef}
                    className="mt-1.5"
                    placeholder={t("nameRequired")}
                    value={customer.name}
                    maxLength={100}
                    disabled={materialLocked}
                    aria-invalid={nameInvalid}
                    aria-describedby="name-requirement"
                    aria-errormessage={
                      nameInvalid ? "name-requirement" : undefined
                    }
                    onChange={(event) =>
                      setCustomer((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <p
                    id="name-requirement"
                    className={`mt-1 text-caption ${
                      nameInvalid
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t("nameRequired")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">{common("phone")} *</Label>
                  <Input
                    id="phone"
                    ref={phoneInputRef}
                    type="tel"
                    className="mt-1.5"
                    placeholder={t("phoneRequired")}
                    value={customer.phone}
                    maxLength={32}
                    disabled={materialLocked}
                    aria-invalid={phoneInvalid}
                    aria-describedby="phone-requirement"
                    aria-errormessage={
                      phoneInvalid ? "phone-requirement" : undefined
                    }
                    onChange={(event) =>
                      setCustomer((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                  <p
                    id="phone-requirement"
                    className={`mt-1 text-caption ${
                      phoneInvalid
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t("phoneRequired")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`${card} p-5 lg:sticky lg:top-20 lg:col-span-5`}>
          <h2 className="font-display text-h3 text-forest-12">
            {t("estimatedTotal")}
          </h2>
          <div className="mt-4 space-y-2 text-caption">
            <Row label={t("estimatedSubtotal")} value={formatPrice(subtotal)} />
            <Row label="GST (5%)" value={formatPrice(tax.gst)} muted />
            <Row label="QST (9.975%)" value={formatPrice(tax.qst)} muted />
            <Separator className="my-2" />
            <div className="flex justify-between text-body font-bold text-forest-12">
              <span>{t("estimatedTotal")}</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            {t("estimateNotice")}
          </p>
          <p id="payment-note" className="mt-2 text-caption text-muted-foreground">
            {t("payInPerson")}
          </p>

          <TurnstileChallenge
            key={challengeGeneration}
            regionRef={challengeRegionRef}
            onToken={setChallengeToken}
            onStateChange={setChallengeState}
            onRetry={requestFreshChallenge}
          />

          {phase === "checking" && (
            <RecoveryMessage
              ref={recoverySummaryRef}
              icon={<RefreshCw aria-hidden className="size-5 animate-spin" />}
              title={t("checkingReceiptTitle")}
              body={t("checkingReceiptBody")}
              live="assertive"
            />
          )}
          {phase === "confirmed-not-found" && (
            <RecoveryMessage
              ref={recoverySummaryRef}
              icon={<ShieldCheck aria-hidden className="size-5" />}
              title={t("notFoundTitle")}
              body={t("notFoundBody")}
              live="assertive"
            >
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full"
                onClick={() => {
                  setPhase("idle");
                  setError(null);
                  challengeRegionRef.current?.focus();
                }}
              >
                {t("verifyAndRetry")}
              </Button>
            </RecoveryMessage>
          )}
          {phase === "still-uncertain" && (
            <RecoveryMessage
              ref={recoverySummaryRef}
              icon={<CircleAlert aria-hidden className="size-5" />}
              title={t("uncertainTitle")}
              body={t("uncertainBody")}
              live="assertive"
            >
              {recoveryPhone && (
                <a
                  href={`tel:${recoveryPhone.replace(/[^+\d]/g, "")}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "mt-3 min-h-11 w-full",
                  })}
                >
                  <Phone aria-hidden className="size-4" />
                  {t("callCafe", { phone: recoveryPhone })}
                </a>
              )}
            </RecoveryMessage>
          )}
          {phase === "accepted-tracking-unavailable" && acceptedFallback && (
            <RecoveryMessage
              ref={recoverySummaryRef}
              icon={<CircleAlert aria-hidden className="size-5" />}
              title={t("acceptedFallbackTitle")}
              body={t("acceptedFallbackBody", {
                order: acceptedFallback.order_number,
                total: formatPrice(acceptedFallback.total),
              })}
              live="assertive"
            >
              {recoveryPhone && (
                <a
                  href={`tel:${recoveryPhone.replace(/[^+\d]/g, "")}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "mt-3 min-h-11 w-full",
                  })}
                >
                  <Phone aria-hidden className="size-4" />
                  {t("callCafe", { phone: recoveryPhone })}
                </a>
              )}
            </RecoveryMessage>
          )}

          {error && (
            <div
              id="submit-error"
              ref={errorSummaryRef}
              tabIndex={-1}
              className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-caption text-destructive outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              <p>{t(error.translationKey)}</p>
              {error.showMenuLink && (
                <Link
                  href="/menu"
                  className={buttonVariants({
                    variant: "link",
                    className: "mt-2 min-h-11 px-0 text-destructive",
                  })}
                >
                  {common("viewMenu")}
                </Link>
              )}
            </div>
          )}

          <Button
            variant="default"
            size="lg"
            className="mt-5 h-12 w-full rounded-full"
            disabled={
              !cafeOpen ||
              submissionLocked ||
              phase === "confirmed-not-found" ||
              challengeState !== "ready"
            }
            onClick={handleSubmitOrder}
            aria-busy={busy}
            aria-describedby={error ? "payment-note submit-error" : "payment-note"}
          >
            {!cafeOpen
              ? cafeInfo
                ? t("orderingClosed")
                : t("orderingUnavailable")
              : phase === "checking"
                ? t("checkingReceipt")
                : phase === "submitting"
                  ? t("processing")
                  : t("placeOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TurnstileChallenge({
  regionRef,
  onToken,
  onStateChange,
  onRetry,
}: {
  regionRef: React.RefObject<HTMLDivElement | null>;
  onToken: (token: string | null) => void;
  onStateChange: (state: ChallengeState) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("order");
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const interceptedTestToken =
    process.env.NEXT_PUBLIC_ORDER_CHALLENGE_TEST_TOKEN;
  const [scriptReady, setScriptReady] = useState(false);
  const [state, setState] = useState<ChallengeState>(() =>
    interceptedTestToken ? "ready" : siteKey ? "loading" : "unavailable",
  );

  const changeState = useCallback((next: ChallengeState) => {
    setState(next);
    onStateChange(next);
  }, [onStateChange]);

  useEffect(() => {
    if (interceptedTestToken) {
      const timeout = window.setTimeout(() => {
        onToken(interceptedTestToken);
        onStateChange("ready");
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    if (!siteKey) {
      const timeout = window.setTimeout(() => {
        onToken(null);
        onStateChange("unavailable");
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    if (window.turnstile) {
      const timeout = window.setTimeout(() => setScriptReady(true), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [interceptedTestToken, onStateChange, onToken, siteKey]);

  useEffect(() => {
    if (
      interceptedTestToken ||
      !siteKey ||
      !scriptReady ||
      !window.turnstile ||
      !widgetContainerRef.current
    ) {
      return;
    }
    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: siteKey,
      action: process.env.NEXT_PUBLIC_TURNSTILE_ACTION ?? "order_create",
      appearance: "interaction-only",
      retry: "auto",
      "refresh-expired": "manual",
      callback: (token: string) => {
        onToken(token);
        changeState("ready");
      },
      "before-interactive-callback": () => changeState("interactive"),
      "after-interactive-callback": () => changeState("checking"),
      "expired-callback": () => {
        onToken(null);
        changeState("expired");
      },
      "timeout-callback": () => {
        onToken(null);
        changeState("expired");
      },
      "error-callback": () => {
        onToken(null);
        changeState("unavailable");
      },
    });
    const widgetId = widgetIdRef.current;
    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [changeState, interceptedTestToken, onToken, scriptReady, siteKey]);

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      className="mt-4 min-h-28 rounded-xl border border-border bg-muted/40 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-labelledby="challenge-title"
    >
      {siteKey && !interceptedTestToken && (
        <Script
          id="turnstile-api"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
          onError={() => changeState("unavailable")}
        />
      )}
      <div className="flex items-start gap-2">
        <ShieldCheck
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p id="challenge-title" className="text-caption font-semibold">
            {t("verificationTitle")}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground" aria-live="polite">
            {t(`challenge.${state}`)}
          </p>
        </div>
      </div>
      <div ref={widgetContainerRef} className="mt-2 max-w-full overflow-hidden" />
      {(state === "expired" || state === "unavailable") && (
        <Button
          type="button"
          variant="outline"
          className="mt-2 min-h-11 w-full"
          onClick={onRetry}
        >
          <RefreshCw aria-hidden className="size-4" />
          {t("retryVerification")}
        </Button>
      )}
    </div>
  );
}

const RecoveryMessage = ({
  ref,
  icon,
  title,
  body,
  live,
  children,
}: {
  ref: React.Ref<HTMLDivElement>;
  icon: React.ReactNode;
  title: string;
  body: string;
  live: "polite" | "assertive";
  children?: React.ReactNode;
}) => (
  <div
    ref={ref}
    tabIndex={-1}
    aria-live={live}
    className="mt-3 rounded-xl border border-accent-border bg-accent-surface p-3 text-caption outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div className="flex items-start gap-2 text-accent-text">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{body}</p>
      </div>
    </div>
    {children}
  </div>
);

function Row({
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

function TimePill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="default"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 rounded-full px-4 text-caption font-medium tabular-nums ${
        selected
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/60"
      }`}
    >
      {children}
    </Button>
  );
}
