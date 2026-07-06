"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Minus, X, Clock } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Watermelon } from "@/components/brand/watermelon";
import { formatPrice } from "@/lib/utils/format";
import { getOpenStatus, getCafeWeekday, getCafeMinutes, formatTime } from "@/lib/hours";
import type { CafeInfo } from "@/lib/types";

type Props = { locale: string; cafeInfo: CafeInfo };

function generateTimeSlots(cafeInfo: CafeInfo): string[] {
  // Café-timezone clock, shared with getOpenStatus so slots and status agree.
  const today = cafeInfo.hours.find((h) => h.day === getCafeWeekday());
  if (!today || today.closed) return [];

  const leadTime = cafeInfo.pickupLeadTime || 15;
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const earliestMin = Math.max(Math.ceil((getCafeMinutes() + leadTime) / 15) * 15, openMin);

  const slots: string[] = [];
  for (let m = earliestMin; m < closeMin; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return slots.slice(0, 8);
}

export function OrderContent({ locale, cafeInfo }: Props) {
  const t = useTranslations("order");
  const tc = useTranslations("common");
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const customerInfo = useCartStore((s) => s.customerInfo);
  const setCustomerInfo = useCartStore((s) => s.setCustomerInfo);
  const pickupTime = useCartStore((s) => s.pickupTime);
  const setPickupTime = useCartStore((s) => s.setPickupTime);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTax = useCartStore((s) => s.getTax);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const status = getOpenStatus(cafeInfo.hours);
  const cafeOpen = status.isOpen;
  const timeSlots = generateTimeSlots(cafeInfo);

  const nameInvalid = attempted && !customerInfo.name.trim();
  const phoneInvalid = attempted && customerInfo.phone.replace(/\D/g, "").length < 10;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-5 py-24 text-center">
        <Watermelon size={64} />
        <div>
          <h1 className="font-display text-h2 text-forest-12">{tc("emptyCart")}</h1>
          <p className="mt-2 text-body text-muted-foreground">
            {locale === "fr"
              ? "Parcourez notre menu et ajoutez vos favoris."
              : "Browse our menu and add a few favourites."}
          </p>
        </div>
        <Link href="/menu">
          <Button variant="default" size="lg" className="h-12 rounded-full px-8">
            {tc("viewMenu")}
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  const nextOpenLabel = status.isOpen
    ? ""
    : status.isToday
      ? formatTime(status.nextOpen, locale)
      : `${tc(`daysShort.${status.nextDay}`)} ${formatTime(status.nextOpen, locale)}`;

  const handleSubmitOrder = async () => {
    setAttempted(true);
    if (!customerInfo.name.trim() || customerInfo.phone.replace(/\D/g, "").length < 10) return;
    if (!cafeOpen) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            name: locale === "fr" ? item.nameFr : item.nameEn,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers,
            menuItemId: item.menuItemId,
          })),
          customerInfo,
          pickupTime,
          locale,
          total,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit order");
      }

      const data = await res.json();
      clearCart();
      router.push(`/order/confirmation?order=${data.orderNumber}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSubmitting"));
      setLoading(false);
    }
  };

  const card = "rounded-2xl border border-cream-6 bg-card";

  return (
    <div className="mx-auto max-w-5xl px-5 pb-28 pt-10 md:pb-16">
      <h1 className="text-h1">{t("title")}</h1>

      {!cafeOpen && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-orange-6 bg-orange-2 p-4">
          <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-orange-11" />
          <div>
            <p className="font-medium text-orange-12">{t("orderingClosed")}</p>
            {nextOpenLabel && (
              <p className="mt-0.5 text-caption text-orange-11">{t("opensAt", { time: nextOpenLabel })}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Left: items + pickup + info */}
        <div className="space-y-6">
          {/* Cart items */}
          <div className={card}>
            <ul className="divide-y divide-cream-6">
              {items.map((item) => {
                const lineTotal =
                  (item.price + item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) * item.quantity;
                const itemName = locale === "fr" ? item.nameFr : item.nameEn;
                return (
                  <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 sm:flex-1">
                      <p className="font-medium text-forest-12">{itemName}</p>
                      {item.modifiers.length > 0 && (
                        <p className="mt-0.5 truncate text-caption text-muted-foreground">
                          {item.modifiers.map((m) => `${m.name}: ${m.option}`).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <div className="flex items-center rounded-full border border-cream-6">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`${tc("remove")} ${itemName}`}
                          className="flex h-11 w-11 items-center justify-center rounded-l-full text-forest-11 transition-colors hover:bg-cream-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Minus aria-hidden className="size-4" />
                        </button>
                        <span className="w-8 text-center text-caption font-medium tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`${tc("add")} ${itemName}`}
                          className="flex h-11 w-11 items-center justify-center rounded-r-full text-forest-11 transition-colors hover:bg-cream-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Plus aria-hidden className="size-4" />
                        </button>
                      </div>
                      <span className="text-caption font-semibold tabular-nums text-forest-12 sm:w-20 sm:text-right">
                        {formatPrice(lineTotal)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label={`${tc("remove")} ${itemName}`}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-cream-3 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X aria-hidden className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pickup time */}
          {cafeOpen && (
            <div className={`${card} p-5`}>
              <h2 className="text-label uppercase tracking-wide text-muted-foreground">{t("pickupTime")}</h2>
              <p className="mt-2 text-caption text-muted-foreground">{t("pickupTimeDescription")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <TimePill selected={!pickupTime} onClick={() => setPickupTime(null)}>
                  {t("asap")}
                </TimePill>
                {timeSlots.map((time) => (
                  <TimePill key={time} selected={pickupTime === time} onClick={() => setPickupTime(time)}>
                    {formatTime(time, locale)}
                  </TimePill>
                ))}
              </div>
            </div>
          )}

          {/* Customer info */}
          {cafeOpen && (
            <div className={`${card} p-5`}>
              <h2 className="text-label uppercase tracking-wide text-muted-foreground">{t("customerInfo")}</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">{tc("name")} *</Label>
                  <Input
                    id="name"
                    className="mt-1.5"
                    placeholder={t("nameRequired")}
                    value={customerInfo.name}
                    aria-invalid={nameInvalid}
                    onChange={(e) => setCustomerInfo({ name: e.target.value })}
                  />
                  {nameInvalid && <p className="mt-1 text-caption text-destructive">{t("nameRequired")}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">{tc("phone")} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="mt-1.5"
                    placeholder={t("phoneRequired")}
                    value={customerInfo.phone}
                    aria-invalid={phoneInvalid}
                    onChange={(e) => setCustomerInfo({ phone: e.target.value })}
                  />
                  {phoneInvalid && <p className="mt-1 text-caption text-destructive">{t("phoneRequired")}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: order summary (sticky on desktop) */}
        <div className={`${card} p-5 lg:sticky lg:top-20`}>
          <h2 className="font-display text-h3 text-forest-12">{tc("total")}</h2>
          <div className="mt-4 space-y-2 text-caption">
            <Row label={tc("subtotal")} value={formatPrice(subtotal)} />
            <Row label="GST (5%)" value={formatPrice(tax.gst)} muted />
            <Row label="QST (9.975%)" value={formatPrice(tax.qst)} muted />
            <Separator className="my-2" />
            <div className="flex justify-between text-body font-bold text-forest-12">
              <span>{tc("total")}</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">{t("payInPerson")}</p>
          {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
          <Button
            variant="default"
            size="lg"
            className="mt-5 h-12 w-full rounded-full"
            disabled={!cafeOpen || loading}
            onClick={handleSubmitOrder}
          >
            {!cafeOpen ? t("orderingClosed") : loading ? t("processing") : t("placeOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : "text-forest-12"}`}>
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
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-caption font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
        selected
          ? "border-forest-9 bg-forest-9 text-cream-1"
          : "border-cream-6 bg-card text-forest-11 hover:border-forest-8"
      }`}
    >
      {children}
    </button>
  );
}
