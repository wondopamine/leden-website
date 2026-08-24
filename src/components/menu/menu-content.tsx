"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogClose,
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
  "min-h-11 shrink-0 rounded-full px-4 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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
      <div className="sticky top-16 z-30 -mx-5 mt-6 overflow-x-auto border-b border-border/70 bg-background/90 px-5 py-3 backdrop-blur-sm">
        <div className="flex gap-2" role="group" aria-label={t("title")}>
          <button
            onClick={() => setActiveCategory(null)}
            aria-pressed={activeCategory === null}
            className={`${tabBase} ${
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-muted"
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
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
      className={`group flex min-h-24 w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-[transform,box-shadow,border-color] sm:gap-4 sm:p-4 ${
        disabled
          ? "cursor-not-allowed border-border opacity-70"
          : "cursor-pointer border-border hover:-translate-y-px hover:border-primary/60 hover:shadow-sm active:translate-y-0"
      } ${justAdded ? "border-primary/60 ring-2 ring-primary/30" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
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
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-label font-bold tabular-nums text-primary-foreground shadow-sm">
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
          <span className="shrink-0 text-body font-semibold tabular-nums text-accent-text">
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
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold tabular-nums text-primary-foreground">
            {cartCount}
          </div>
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
  const tc = useTranslations("common");
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string | undefined>>(() => {
    const initial: Record<string, string | undefined> = {};
    item.modifiers.forEach((modifier) => {
      initial[modifier._id] =
        modifier.minSelections === 1 ? modifier.options[0]?._id : undefined;
    });
    return initial;
  });

  const modifierTotal = item.modifiers.reduce((sum, modifier) => {
    const selectedId = selections[modifier._id];
    const option = modifier.options.find((candidate) => candidate._id === selectedId);
    return sum + (option?.priceAdjustment ?? 0);
  }, 0);

  const unitPrice = item.price + modifierTotal;
  const totalPrice = unitPrice * quantity;
  const imgSrc = getItemImageUrl(item);
  const remainingLineSlots = Math.max(0, 50 - cartItems.length);
  const remainingItemSlots = Math.max(
    0,
    100 - cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
  );
  const maxQuantity = Math.min(20, remainingLineSlots, remainingItemSlots);
  const requiredSelectionsComplete = item.modifiers.every(
    (modifier) =>
      modifier.minSelections === 0 || Boolean(selections[modifier._id]),
  );
  const canAdd = maxQuantity > 0 && requiredSelectionsComplete;

  const handleAdd = () => {
    if (!canAdd || quantity > maxQuantity) return;
    const modifiers = item.modifiers.flatMap((modifier) => {
      const option = modifier.options.find(
        (candidate) => candidate._id === selections[modifier._id],
      );
      if (!option) return [];
      return [{
        modifierId: modifier._id,
        optionId: option._id,
        name: getLocalizedString(modifier.name, locale),
        option: getLocalizedString(option.name, locale),
        priceAdjustment: option.priceAdjustment,
      }];
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100svh-2rem)] max-w-md gap-0 overflow-y-auto p-0"
      >
        <DialogClose
          render={
            <Button
              variant="secondary"
              size="icon"
              aria-label={tc("close")}
              className="absolute right-3 top-3 z-10 shadow-sm"
            />
          }
        >
          <X aria-hidden className="size-4" />
        </DialogClose>
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
              {item.modifiers.map((mod) => (
                <fieldset key={mod._id}>
                  <legend className="mb-2.5 text-caption font-semibold text-muted-foreground">
                    {getLocalizedString(mod.name, locale)}
                    <span className="ml-1 font-normal">
                      {mod.minSelections === 1 ? t("required") : t("optional")}
                    </span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {mod.options.map((option) => {
                      const selected = selections[mod._id] === option._id;
                      return (
                        <button
                          key={option._id}
                          onClick={() =>
                            setSelections((previous) => ({
                              ...previous,
                              [mod._id]:
                                selected && mod.minSelections === 0
                                  ? undefined
                                  : option._id,
                            }))
                          }
                          aria-pressed={selected}
                          className={`min-h-11 rounded-full border px-3.5 py-2 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/60"
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
                </fieldset>
              ))}
            </div>
          )}

          <Separator className="my-5" />

          <div className="flex items-center gap-4">
            {/* Quantity selector */}
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label={`${tc("remove")} ${getLocalizedString(item.name, locale)}`}
                className="flex size-11 items-center justify-center rounded-l-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <span className="w-8 text-center text-body font-medium tabular-nums" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                aria-label={`${tc("add")} ${getLocalizedString(item.name, locale)}`}
                disabled={quantity >= maxQuantity}
                className="flex size-11 items-center justify-center rounded-r-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>

            <Button
              variant="default"
              size="lg"
              className="h-12 flex-1 text-caption font-semibold"
              onClick={handleAdd}
              disabled={!canAdd || quantity > maxQuantity}
            >
              {t("addToOrder")} · {formatPrice(totalPrice)}
            </Button>
          </div>
          {maxQuantity === 0 && (
            <p className="mt-2 text-caption text-destructive" role="status">
              {t("cartLimit")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
