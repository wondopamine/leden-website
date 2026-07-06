"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

export function AnnouncementBanner({ text }: { text: string }) {
  const t = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-primary py-2.5 pl-4 pr-12 text-center text-caption font-medium text-primary-foreground">
      <span>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t("close")}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
