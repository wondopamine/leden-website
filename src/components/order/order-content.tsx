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

export function OrderContent({ locale }: { locale: string }) {
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
          })),
          customerInfo,
          pickupTime,
          locale,
          total,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit order");

      const data = await res.json();
      clearCart();
      router.push(`/order/confirmation?order=${data.orderNumber}`);
    } catch {
      setError(t("errorSubmitting"));
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold">{t("title")}</h1>

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
            {generateTimeSlots().map((time) => (
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

      {/* Customer info */}
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
          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!customerInfo.name || !customerInfo.phone || loading}
            onClick={handleSubmitOrder}
          >
            {loading ? t("processing") : t("placeOrder")}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function generateTimeSlots(): string[] {
  const now = new Date();
  const slots: string[] = [];
  const startMinutes = Math.ceil((now.getHours() * 60 + now.getMinutes() + 20) / 15) * 15;

  for (let m = startMinutes; m < 15 * 60; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h >= 7 && h < 15) {
      slots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }
  }
  return slots.slice(0, 8);
}
