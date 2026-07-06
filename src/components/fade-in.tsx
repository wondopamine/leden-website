"use client";

import * as React from "react";

import { useFadeIn } from "@/hooks/use-fade-in";
import { cn } from "@/lib/utils";

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  as?: "div" | "li" | "section" | "article";
}) {
  const { ref, isVisible } = useFadeIn(0.15);

  const translateClass = {
    up: "translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
    none: "",
  }[direction];

  const Comp = Tag as React.ElementType;

  return (
    <Comp
      ref={ref}
      className={cn(
        "transition-all motion-reduce:transition-none",
        isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${translateClass}`,
        className
      )}
      style={{
        transitionDuration: "var(--duration-slow)",
        transitionTimingFunction: "var(--ease-out)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Comp>
  );
}
