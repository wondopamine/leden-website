"use client";

import { useTranslations } from "next-intl";
import { useCartStore } from "@/lib/cart-store";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils/format";
import { useState } from "react";
import type { CafeInfo } from "@/lib/sanity/types";

type Props = {
  locale: string;
  cafeInfo: CafeInfo;
};

function getTodayHours(cafeInfo: CafeInfo) {
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return cafeInfo.hours.find((h) => h.day === dayName);
}

function isCafeOpen(cafeInfo: CafeInfo): boolean {
  const today = getTodayHours(cafeInfo);
  if (!today || today.closed) return false;

  const now = new Date();
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  return nowMin >= openMin && nowMin < closeMin;
}

function getNextOpenInfo(cafeInfo: CafeInfo): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIdx = new Date().getDay();

  // Check remaining time today
  const today = getTodayHours(cafeInfo);
  if (today && !today.closed) {
    const now = new Date();
    const [openH, openM] = today.open.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = openH * 60 + openM;
    if (nowMin < openMin) {
      return `${today.open}`;
    }
  }

  // Check next days
  for (let i = 1; i <= 7; i++) {
    const dayIdx = (todayIdx + i) % 7;
    const dayName = days[dayIdx];
    const dayHours = cafeInfo.hours.find((h) => h.day === dayName);
    if (dayHours && !dayHours.closed) {
      return `${dayName} ${dayHours.open}`;
    }
  }
  return "";
}

function generateTimeSlots(cafeInfo: CafeInfo): string[] {
  const today = getTodayHours(cafeInfo);
  if (!today || today.closed) return [];

  const now = new Date();
  const leadTime = cafeInfo.pickupLeadTime || 15;
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  // Earliest possible pickup: now + lead time, rounded up to next 15-min slot
  const earliestMin = Math.max(
    Math.ceil((now.getHours() * 60 + now.getMinutes() + leadTime) / 15) * 15,
    openMin
  );

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

  const cafeOpen = isCafeOpen(cafeInfo);
  const timeSlots = generateTimeSlots(cafeInfo);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-lg text-muted-foreground">{tc("emptyCart")}</p>
        <Link href="/menu">
          <Button>{tc("viewMenu")}</Button>
        </Link>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) return;
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

  return (
    <>
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {/* Closed banner */}
      {!cafeOpen && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="font-medium text-amber-800">{t("orderingClosed")}</p>
            {getNextOpenInfo(cafeInfo) && (
              <p className="mt-1 text-sm text-amber-700">
                {t("opensAt", { time: getNextOpenInfo(cafeInfo) })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cart items */}
      <Card className="mt-8">
        <CardContent className="divide-y p-0">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-medium">
                  {locale === "fr" ? item.nameFr : item.nameEn}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.modifiers.map((m) => `${m.name}: ${m.option}`).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  -
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </Button>
              </div>
              <span className="w-20 text-right text-sm font-medium">
                {formatPrice(
                  (item.price +
                    item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)) *
                    item.quantity
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                &times;
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pickup time */}
      {cafeOpen && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("pickupTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("pickupTimeDescription")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!pickupTime ? "default" : "outline"}
                size="sm"
                onClick={() => setPickupTime(null)}
              >
                {t("asap")}
              </Button>
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  variant={pickupTime === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPickupTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer info */}
      {cafeOpen && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("customerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">{tc("name")} *</Label>
              <Input
                id="name"
                placeholder={t("nameRequired")}
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">{tc("phone")} *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("phoneRequired")}
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order summary */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{tc("subtotal")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST (5%)</span>
              <span>{formatPrice(tax.gst)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>QST (9.975%)</span>
              <span>{formatPrice(tax.qst)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>{tc("total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("payInPerson")}</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          {cafeOpen ? (
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={!customerInfo.name || !customerInfo.phone || loading}
              onClick={handleSubmitOrder}
            >
              {loading ? t("processing") : t("placeOrder")}
            </Button>
          ) : (
            <Button className="mt-6 w-full" size="lg" disabled>
              {t("orderingClosed")}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
