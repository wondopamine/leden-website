"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal visibility. SSR-safe (always starts hidden so server and first
 * client render match), then on mount:
 *   - if the user prefers reduced motion, reveals immediately (no transition), or
 *   - if IntersectionObserver is unavailable, reveals immediately (graceful fallback), or
 *   - otherwise reveals when the element scrolls into view.
 * Combined with the global `prefers-reduced-motion` guard in globals.css, no user
 * is ever left staring at permanently-invisible (opacity:0) content.
 */
export function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      // Reveal on the next frame (deferred, not a synchronous setState in the effect body).
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

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
  }, [threshold]);

  return { ref, isVisible };
}
