"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Globe, Menu, ShoppingBag, X } from "lucide-react";
import { WordmarkHorizontal } from "@/components/brand/wordmark-horizontal";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/lib/cart-store";
import { useState } from "react";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "fr", label: "Français", shortLabel: "FR" },
] as const;

export function Header() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const itemCount = useCartStore((state) => state.items.length);
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const navItems = [
    { href: "/", label: t("home") },
    { href: "/menu", label: t("menu") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
        <Link
          href="/"
          aria-label="Café Le Den"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <WordmarkHorizontal className="inline-flex [&>svg]:h-9 [&>svg]:w-auto sm:[&>svg]:h-10" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("menu")}>
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={buttonVariants({
                  variant: "ghost",
                  size: "default",
                  className: "px-4 aria-[current=page]:bg-muted aria-[current=page]:text-foreground",
                })}
              >
                {item.label}
              </Link>
            );
          })}

          <LanguageMenu locale={locale} onSelect={switchLocale} label={t("language")} />
          <CartButton itemCount={itemCount} label={t("cart")} />
        </nav>

        <div className="flex items-center gap-0.5 md:hidden">
          <CartButton itemCount={itemCount} label={t("cart")} />
          <LanguageMenu locale={locale} onSelect={switchLocale} label={t("language")} compact />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label={t("menu")} />}
            >
              <Menu aria-hidden className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton={false}
              className="w-[min(19rem,calc(100vw-2rem))] p-5"
            >
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("close")}
                    className="absolute right-3 top-3"
                  />
                }
              >
                <X aria-hidden className="size-5" />
              </SheetClose>
              <nav className="mt-12 flex flex-col gap-2" aria-label={t("menu")}>
                {navItems.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={buttonVariants({
                        variant: active ? "secondary" : "ghost",
                        size: "default",
                        className: "h-12 justify-start px-4 text-base",
                      })}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-border pt-5">
                <p className="mb-2 text-caption font-semibold text-muted-foreground">
                  {t("language")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((language) => (
                    <Button
                      key={language.code}
                      variant={locale === language.code ? "secondary" : "outline"}
                      aria-pressed={locale === language.code}
                      onClick={() => {
                        switchLocale(language.code);
                        setMobileOpen(false);
                      }}
                      className="h-11"
                    >
                      {language.shortLabel}
                      <span className="sr-only">{language.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function CartButton({ itemCount, label }: { itemCount: number; label: string }) {
  return (
    <Link
      href="/order"
      aria-label={itemCount > 0 ? `${label} (${itemCount})` : label}
      className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
    >
      <ShoppingBag aria-hidden className="size-5" />
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-label font-bold tabular-nums text-accent-foreground">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

function LanguageMenu({
  locale,
  onSelect,
  label,
  compact = false,
}: {
  locale: string;
  onSelect: (locale: string) => void;
  label: string;
  compact?: boolean;
}) {
  const currentLanguage = languages.find((language) => language.code === locale) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={compact ? "icon" : "default"}
            aria-label={`${label}: ${currentLanguage.label}`}
          />
        }
      >
        <Globe aria-hidden className="size-4" />
        {compact ? (
          <span className="sr-only">{currentLanguage.shortLabel}</span>
        ) : (
          <span>{currentLanguage.shortLabel}</span>
        )}
        {!compact && <ChevronDown aria-hidden className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          aria-label={label}
          value={locale}
          onValueChange={(value) => onSelect(String(value))}
        >
          {languages.map((language) => (
            <DropdownMenuRadioItem
              key={language.code}
              value={language.code}
              closeOnClick
            >
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
