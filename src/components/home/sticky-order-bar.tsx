"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/utils/format";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Mobile-only sticky order action in the thumb zone. Follows the whole scroll.
 * Empty cart → "Order for pickup" (to menu). Non-empty → count + subtotal (to cart).
 */
export function StickyOrderBar({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean }) {
  const t = useTranslations("common");
  const to = useTranslations("order");
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const hasItems = count > 0;

  if (hideWhenEmpty && !hasItems) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <Link
          href={hasItems ? "/order" : "/menu"}
          className={buttonVariants({
            variant: "default",
            size: "lg",
            className:
              "flex h-12 w-full justify-between gap-3 rounded-full bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          })}
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag aria-hidden className="size-5" />
            {hasItems ? to("itemsInCart", { count }) : t("orderForPickup")}
          </span>
          <span className="flex items-center gap-2 font-semibold tabular-nums">
            {hasItems && <span>{formatPrice(getSubtotal())}</span>}
            <ArrowRight aria-hidden className="size-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
