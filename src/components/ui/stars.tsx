"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const starsVariants = cva(
  "inline-flex gap-0.5 text-brand-orange-500",
  {
    variants: {
      size: {
        sm: "[&_svg]:size-3.5",
        md: "[&_svg]:size-4",
        lg: "[&_svg]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  }
);

type StarsProps = React.ComponentProps<"span"> &
  VariantProps<typeof starsVariants> & {
    count: number;
    max?: number;
  };

export function Stars({ className, size, count, max = 5, ...props }: StarsProps) {
  return (
    <span
      data-slot="stars"
      className={cn(starsVariants({ size }), className)}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={i < count ? "fill-current" : "fill-muted stroke-current opacity-30"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.368-2.447a1 1 0 00-1.175 0l-3.368 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

export { starsVariants };
