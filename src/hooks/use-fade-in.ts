"use client";

import { useEffect, useRef, useState } from "react";

export function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  // Start visible if the user prefers reduced motion (checked at hook-call time,
  // safe in client component since "use client" ensures browser execution).
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    // Already visible (reduced-motion path) — skip observer setup.
    if (isVisible) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible, threshold]);

  return { ref, isVisible };
}
