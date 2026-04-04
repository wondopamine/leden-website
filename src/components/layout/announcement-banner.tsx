"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBanner({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
      <span>{text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors hover:bg-primary-foreground/20"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
