"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const iconVariants = cva(
  "inline-block shrink-0",
  {
    variants: {
      size: {
        sm: "size-3.5",
        md: "size-4",
        lg: "size-5",
      },
      intent: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        brand: "text-primary",
      },
    },
    defaultVariants: { size: "md", intent: "default" },
  }
);

type IconProps = Omit<React.ComponentProps<"svg">, "as"> &
  VariantProps<typeof iconVariants> & {
    as: LucideIcon;
  };

export function Icon({ as: Component, className, size, intent, ...props }: IconProps) {
  return (
    <Component
      data-slot="icon"
      className={cn(iconVariants({ size, intent }), className)}
      {...props}
    />
  );
}

export { iconVariants };
