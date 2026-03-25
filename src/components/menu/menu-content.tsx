"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCartStore } from "@/lib/cart-store";
import { getLocalizedString, formatPrice } from "@/lib/utils/format";
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

  const filteredItems = activeCategory
    ? items.filter((item) => item.category.slug === activeCategory)
    : items;

  return (
    <>
      <h1 className="text-3xl font-bold">{t("title")}</h1>

      {/* Category filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          {t("allCategories")}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat._id}
            variant={activeCategory === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.slug)}
          >
            {getLocalizedString(cat.name, locale)}
          </Button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <MenuItemCard
            key={item._id}
            item={item}
            locale={locale}
            onSelect={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {/* Customization dialog */}
      {selectedItem && (
        <ItemCustomizeDialog
          item={selectedItem}
          locale={locale}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

function MenuItemCard({
  item,
  locale,
  onSelect,
}: {
  item: MenuItem;
  locale: string;
  onSelect: () => void;
}) {
  const t = useTranslations("menu");
  const addItem = useCartStore((s) => s.addItem);

  const handleQuickAdd = () => {
    if (item.modifiers.length > 0) {
      onSelect();
      return;
    }
    addItem({
      menuItemId: item._id,
      name: getLocalizedString(item.name, locale),
      nameEn: item.name.en,
      nameFr: item.name.fr,
      price: item.price,
      quantity: 1,
      modifiers: [],
    });
  };

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${!item.available ? "opacity-50" : ""}`}>
      <div className="aspect-[3/2] bg-muted/30 flex items-center justify-center">
        <span className="text-3xl">
          {item.category.slug === "coffee"
            ? "\u2615"
            : item.category.slug === "tea"
              ? "\uD83C\uDF75"
              : item.category.slug === "breakfast"
                ? "\uD83C\uDF73"
                : item.category.slug === "lunch"
                  ? "\uD83C\uDF5C"
                  : "\uD83E\uDD50"}
        </span>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{getLocalizedString(item.name, locale)}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {getLocalizedString(item.description, locale)}
            </p>
          </div>
          <span className="shrink-0 font-semibold text-primary">
            {formatPrice(item.price)}
          </span>
        </div>
        {!item.available ? (
          <Badge variant="secondary" className="mt-3">
            {t("soldOut")}
          </Badge>
        ) : (
          <Button
            className="mt-3 w-full"
            size="sm"
            onClick={handleQuickAdd}
          >
            {item.modifiers.length > 0 ? t("customize") : t("addToOrder")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ItemCustomizeDialog({
  item,
  locale,
  open,
  onClose,
}: {
  item: MenuItem;
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("menu");
  const addItem = useCartStore((s) => s.addItem);
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    item.modifiers.forEach((_, idx) => {
      initial[idx] = 0;
    });
    return initial;
  });

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

    addItem({
      menuItemId: item._id,
      name: getLocalizedString(item.name, locale),
      nameEn: item.name.en,
      nameFr: item.name.fr,
      price: item.price,
      quantity: 1,
      modifiers,
    });
    onClose();
  };

  const totalPrice =
    item.price +
    item.modifiers.reduce((sum, mod, idx) => {
      const optionIdx = selections[idx] ?? 0;
      return sum + (mod.options[optionIdx]?.priceAdjustment ?? 0);
    }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getLocalizedString(item.name, locale)}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {getLocalizedString(item.description, locale)}
        </p>

        <div className="mt-4 space-y-6">
          {item.modifiers.map((mod, modIdx) => (
            <div key={modIdx}>
              <h4 className="mb-2 text-sm font-semibold">
                {getLocalizedString(mod.name, locale)}
              </h4>
              <div className="flex flex-wrap gap-2">
                {mod.options.map((option, optIdx) => (
                  <Button
                    key={optIdx}
                    variant={selections[modIdx] === optIdx ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelections((prev) => ({ ...prev, [modIdx]: optIdx }))
                    }
                  >
                    {getLocalizedString(option.name, locale)}
                    {option.priceAdjustment > 0 && (
                      <span className="ml-1 text-xs opacity-70">
                        +{formatPrice(option.priceAdjustment)}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
          <Button onClick={handleAdd}>{t("addToOrder")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
