"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/cart-store";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { getMenuItemImage } from "@/lib/menu-images";
import type { MenuItem, Category } from "@/lib/sanity/types";

type Props = {
  categories: Category[];
  items: MenuItem[];
  locale: string;
};

export function MenuContent({ categories, items, locale }: Props) {
  const t = useTranslations("menu");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  const filteredItems = activeCategory
    ? items.filter((item) => item.category.slug === activeCategory)
    : items;

  const handleItemAdded = useCallback((itemId: string) => {
    setAddedItemId(itemId);
    setTimeout(() => setAddedItemId(null), 1200);
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>

      {/* Category filters — sticky on scroll */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 overflow-x-auto bg-background/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeCategory === null
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat.slug)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                activeCategory === cat.slug
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {getLocalizedString(cat.name, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items — grouped by category when showing all */}
      {activeCategory === null ? (
        <div className="mt-6 space-y-10">
          {categories.map((cat) => {
            const catItems = items.filter(
              (item) => item.category.slug === cat.slug
            );
            if (catItems.length === 0) return null;
            return (
              <section key={cat._id}>
                <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
                  {getLocalizedString(cat.name, locale)}
                </h2>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item._id}
                      item={item}
                      locale={locale}
                      onSelect={() => setSelectedItem(item)}
                      justAdded={addedItemId === item._id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item._id}
              item={item}
              locale={locale}
              onSelect={() => setSelectedItem(item)}
              justAdded={addedItemId === item._id}
            />
          ))}
        </div>
      )}

      {/* Item detail / customization dialog */}
      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          locale={locale}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdded={handleItemAdded}
        />
      )}
    </>
  );
}

function MenuItemCard({
  item,
  locale,
  onSelect,
  justAdded,
}: {
  item: MenuItem;
  locale: string;
  onSelect: () => void;
  justAdded: boolean;
}) {
  const t = useTranslations("menu");
  const disabled = !item.available;
  const imgSrc = getMenuItemImage(item._id, item.category.slug);

  return (
    <button
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card p-3 text-left transition-all sm:p-4 ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-border hover:bg-accent/30 hover:shadow-sm active:scale-[0.995]"
      } ${justAdded ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
    >
      {/* Photo thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/40 sm:h-20 sm:w-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={getLocalizedString(item.name, locale)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight">
            {getLocalizedString(item.name, locale)}
          </h3>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug text-muted-foreground line-clamp-2">
          {getLocalizedString(item.description, locale)}
        </p>
        {disabled && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {t("soldOut")}
          </Badge>
        )}
      </div>

      {/* Add indicator */}
      {!disabled && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {justAdded ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
      )}
    </button>
  );
}

function ItemDetailDialog({
  item,
  locale,
  open,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  locale: string;
  open: boolean;
  onClose: () => void;
  onAdded: (itemId: string) => void;
}) {
  const t = useTranslations("menu");
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    item.modifiers.forEach((_, idx) => {
      initial[idx] = 0;
    });
    return initial;
  });

  const modifierTotal = item.modifiers.reduce((sum, mod, idx) => {
    const optionIdx = selections[idx] ?? 0;
    return sum + (mod.options[optionIdx]?.priceAdjustment ?? 0);
  }, 0);

  const unitPrice = item.price + modifierTotal;
  const totalPrice = unitPrice * quantity;
  const imgSrc = getMenuItemImage(item._id, item.category.slug);

  const handleAdd = () => {
    const modifiers = item.modifiers.map((mod, idx) => {
      const optionIdx = selections[idx] ?? 0;
      const option = mod.options[optionIdx];
      return {
        name: getLocalizedString(mod.name, locale),
        option: getLocalizedString(option.name, locale),
        priceAdjustment: option.priceAdjustment,
      };
    });

    for (let i = 0; i < quantity; i++) {
      addItem({
        menuItemId: item._id,
        name: getLocalizedString(item.name, locale),
        nameEn: item.name.en,
        nameFr: item.name.fr,
        price: item.price,
        quantity: 1,
        modifiers,
      });
    }

    onAdded(item._id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        {/* Hero area with photo */}
        <div className="relative h-48 overflow-hidden bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={getLocalizedString(item.name, locale)}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">
              {getLocalizedString(item.name, locale)}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {getLocalizedString(item.description, locale)}
            </DialogDescription>
          </DialogHeader>

          {/* Modifiers */}
          {item.modifiers.length > 0 && (
            <div className="mt-5 space-y-5">
              {item.modifiers.map((mod, modIdx) => (
                <div key={modIdx}>
                  <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {getLocalizedString(mod.name, locale)}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mod.options.map((option, optIdx) => {
                      const selected = selections[modIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            setSelections((prev) => ({
                              ...prev,
                              [modIdx]: optIdx,
                            }))
                          }
                          className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:border-foreground/40"
                          }`}
                        >
                          {getLocalizedString(option.name, locale)}
                          {option.priceAdjustment > 0 && (
                            <span className="ml-1 opacity-60">
                              +{formatPrice(option.priceAdjustment)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-5" />

          {/* Quantity + Add to order */}
          <div className="flex items-center gap-4">
            {/* Quantity selector */}
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-muted rounded-l-full"
              >
                &minus;
              </button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-muted rounded-r-full"
              >
                +
              </button>
            </div>

            {/* Add to order CTA with live price */}
            <Button className="flex-1 h-11 text-sm font-semibold" onClick={handleAdd}>
              {t("addToOrder")} — {formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
