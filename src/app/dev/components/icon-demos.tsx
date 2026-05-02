"use client";

// Gallery-only client wrapper for Icon demos.
// Lucide-react icons are React components (functions) and cannot be passed
// across the RSC serialization boundary via the `as` prop. This thin wrapper
// live-renders the composed Icon instances so the gallery page.tsx stays a
// Server Component.

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Coffee, Settings, ShoppingBag, Star } from "lucide-react";

export function IconSizesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Icon as={Coffee} size="sm" intent="default" />
      <Icon as={Coffee} size="md" intent="default" />
      <Icon as={Coffee} size="lg" intent="default" />
    </div>
  );
}

export function IconIntentsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Icon as={Star} size="md" intent="default" />
      <Icon as={Star} size="md" intent="muted" />
      <Icon as={Star} size="md" intent="brand" />
    </div>
  );
}

export function ButtonIconSizesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="icon-xs">
        <Icon as={Settings} size="sm" />
      </Button>
      <Button variant="ghost" size="icon-sm">
        <Icon as={Settings} size="sm" />
      </Button>
      <Button variant="ghost" size="icon">
        <Icon as={Settings} size="md" />
      </Button>
      <Button variant="ghost" size="icon-lg">
        <Icon as={Settings} size="lg" />
      </Button>
    </div>
  );
}

export function BadgeIconDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1">
        <Icon as={ShoppingBag} size="sm" intent="muted" />
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon as={Star} size="sm" intent="default" />
      </span>
    </div>
  );
}
