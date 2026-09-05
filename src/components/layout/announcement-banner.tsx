"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnnouncementBanner({ text }: { text: string }) {
  const t = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-primary py-2.5 pl-4 pr-14 text-center text-caption font-medium text-primary-foreground">
      <span>{text}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        aria-label={t("close")}
        className="absolute right-1 top-1/2 -translate-y-1/2 text-primary-foreground hover:text-primary-foreground hover:opacity-80 focus-visible:border-primary-foreground focus-visible:ring-primary-foreground/50"
      >
        <X aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
