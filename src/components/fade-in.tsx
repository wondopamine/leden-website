"use client";

import { useFadeIn } from "@/hooks/use-fade-in";

export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  const { ref, isVisible } = useFadeIn(0.15);

  const translateClass = {
    up: "translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
    none: "",
  }[direction];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-x-0 translate-y-0"
          : `opacity-0 ${translateClass}`
      } ${className ?? ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
