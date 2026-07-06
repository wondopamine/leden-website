"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Minus } from "lucide-react";
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
import { WatermelonSeed } from "@/components/brand/watermelon";
import { useCartStore } from "@/lib/cart-store";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
import { getItemImageUrl } from "@/lib/menu-images";
import type { MenuItem, Category } from "@/lib/types";

type Props = {
  categories: Category[];
  items: MenuItem[];
  locale: string;
};

const tabBase =
  "shrink-0 rounded-full px-4 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function MenuContent({ categories, items, locale }: Props) {
  const t = useTranslations("menu");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  const visibleItems = items.filter((item) => item.status !== "hidden");
  const filteredItems = activeCategory
    ? visibleItems.filter((item) => item.category.slug === activeCategory)
    : visibleItems;

  const handleItemAdded = useCallback((itemId: string) => {
    setAddedItemId(itemId);
    setTimeout(() => setAddedItemId(null), 1200);
  }, []);

  return (
    <>
      <h1 className="text-h1">{t("title")}</h1>

      {/* Category filters — sticky on scroll */}
      <div className="sticky top-16 z-30 -mx-5 mt-6 overflow-x-auto border-b border-cream-6/60 bg-background/90 px-5 py-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            aria-pressed={activeCategory === null}
            className={`${tabBase} ${
              activeCategory === null
                ? "bg-forest-9 text-cream-1"
                : "bg-cream-3 text-forest-11 hover:bg-cream-4"
            }`}
          >
            {t("allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat.slug)}
              aria-pressed={activeCategory === cat.slug}
              className={`${tabBase} ${
                activeCategory === cat.slug
                  ? "bg-forest-9 text-cream-1"
                  : "bg-cream-3 text-forest-11 hover:bg-cream-4"
              }`}
            >
              {getLocalizedString(cat.name, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items — grouped by category when showing all */}
      {activeCategory === null ? (
        <div className="mt-8 space-y-10">
          {categories.map((cat) => {
            const catItems = visibleItems.filter((item) => item.category.slug === cat.slug);
            if (catItems.length === 0) return null;
            return (
              <section key={cat._id}>
                <h2 className="mb-4 flex items-center gap-2 font-display text-h3 text-forest-12">
                  <WatermelonSeed size={9} />
                  {getLocalizedString(cat.name, locale)}
                </h2>
                <div className="space-y-2.5">
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
        <div className="mt-8 space-y-2.5">
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
  const disabled = item.status === "sold_out";
  const imgSrc = getItemImageUrl(item);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems
    .filter((ci) => ci.menuItemId === item._id)
    .reduce((sum, ci) => sum + ci.quantity, 0);

  return (
    <button
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 rounded-2xl border bg-card p-3 text-left transition-[transform,box-shadow,border-color] sm:p-4 ${
        disabled
          ? "cursor-not-allowed border-cream-6 opacity-70"
          : "cursor-pointer border-cream-6 hover:-translate-y-px hover:border-forest-8 hover:shadow-sm active:translate-y-0"
      } ${justAdded ? "border-forest-8 ring-2 ring-forest-9/30" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
    >
      {/* Photo thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-3 sm:h-20 sm:w-20">
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="80px"
          className={`object-cover ${disabled ? "grayscale" : ""}`}
        />
        {!disabled && cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest-9 text-[11px] font-bold text-cream-1 shadow-sm">
            {cartCount}
          </span>
        )}
      </div>

      {/* Item info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-tight text-forest-12">
            {getLocalizedString(item.name, locale)}
          </h3>
          <span className="shrink-0 text-body font-semibold tabular-nums text-orange-11">
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-caption leading-snug text-muted-foreground">
          {getLocalizedString(item.description, locale)}
        </p>
        {disabled && (
          <Badge variant="secondary" className="mt-2">
            {t("soldOut")}
          </Badge>
        )}
      </div>

      {/* Add indicator */}
      {!disabled &&
        (cartCount > 0 ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-9 text-caption font-bold text-cream-1">
            {cartCount}
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-2 text-forest-9 transition-colors group-hover:bg-forest-9 group-hover:text-cream-1">
            <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          </div>
        ))}
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
  const imgSrc = getItemImageUrl(item);

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
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Hero photo */}
        <div className="relative h-48 overflow-hidden bg-cream-3">
          <Image
            src={imgSrc}
            alt={getLocalizedString(item.name, locale)}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
          />
        </div>

        <div className="p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-h3 text-forest-12">
              {getLocalizedString(item.name, locale)}
            </DialogTitle>
            <DialogDescription className="mt-1 text-caption text-muted-foreground">
              {getLocalizedString(item.description, locale)}
            </DialogDescription>
          </DialogHeader>

          {item.modifiers.length > 0 && (
            <div className="mt-5 space-y-5">
              {item.modifiers.map((mod, modIdx) => (
                <div key={modIdx}>
                  <h4 className="mb-2.5 text-label uppercase tracking-wide text-muted-foreground">
                    {getLocalizedString(mod.name, locale)}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mod.options.map((option, optIdx) => {
                      const selected = selections[modIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setSelections((prev) => ({ ...prev, [modIdx]: optIdx }))}
                          aria-pressed={selected}
                          className={`rounded-full border px-3.5 py-2 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover ${
                            selected
                              ? "border-forest-9 bg-forest-9 text-cream-1"
                              : "border-cream-6 bg-card text-forest-11 hover:border-forest-8"
                          }`}
                        >
                          {getLocalizedString(option.name, locale)}
                          {option.priceAdjustment > 0 && (
                            <span className="ml-1 opacity-70">+{formatPrice(option.priceAdjustment)}</span>
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

          <div className="flex items-center gap-4">
            {/* Quantity selector */}
            <div className="flex items-center rounded-full border border-cream-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="flex h-11 w-11 items-center justify-center rounded-l-full text-forest-11 transition-colors hover:bg-cream-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <span className="w-8 text-center text-body font-medium tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
                className="flex h-11 w-11 items-center justify-center rounded-r-full text-forest-11 transition-colors hover:bg-cream-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>

            <Button variant="default" size="lg" className="h-12 flex-1 text-caption font-semibold" onClick={handleAdd}>
              {t("addToOrder")} · {formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
