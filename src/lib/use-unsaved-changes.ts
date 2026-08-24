"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MESSAGE =
  "Discard your unsaved changes and leave this page?";

type NavigationEventLike = Event & {
  canIntercept: boolean;
  destination: { url: string };
  downloadRequest: string | null;
  hashChange: boolean;
};

type NavigationLike = EventTarget;

/**
 * Protects substantial admin forms from accidental route changes or reloads.
 *
 * Chromium's Navigation API provides the cleanest interception for links and
 * browser history. The click/popstate listeners are a fallback for browsers
 * that do not expose that API; `beforeunload` covers refreshes and tab closes.
 */
export function useUnsavedChanges(
  isDirty: boolean,
  onDiscard: () => void,
  message = DEFAULT_MESSAGE,
) {
  const dirtyRef = useRef(isDirty);
  const onDiscardRef = useRef(onDiscard);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    onDiscardRef.current = onDiscard;
  }, [onDiscard]);

  const confirmDiscard = useCallback(() => {
    if (!dirtyRef.current) return true;

    const confirmed = window.confirm(message);
    if (confirmed) {
      dirtyRef.current = false;
      onDiscardRef.current();
    }
    return confirmed;
  }, [message]);

  const suspendProtection = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  const resumeProtection = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const navigation = (
      window as typeof window & { navigation?: NavigationLike }
    ).navigation;

    if (navigation) {
      const handleNavigate = (rawEvent: Event) => {
        const event = rawEvent as NavigationEventLike;
        if (
          !dirtyRef.current ||
          !event.canIntercept ||
          event.hashChange ||
          event.downloadRequest
        ) {
          return;
        }

        const destination = new URL(event.destination.url);
        if (destination.origin !== window.location.origin) return;

        if (!confirmDiscard()) event.preventDefault();
      };

      navigation.addEventListener("navigate", handleNavigate);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        navigation.removeEventListener("navigate", handleNavigate);
      };
    }

    let restoringHistory = false;
    const handleClick = (event: MouseEvent) => {
      if (
        !dirtyRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname &&
          destination.search === current.search &&
          destination.hash === current.hash)
      ) {
        return;
      }

      if (!confirmDiscard()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (restoringHistory) {
        restoringHistory = false;
        return;
      }
      if (dirtyRef.current && !confirmDiscard()) {
        restoringHistory = true;
        window.history.forward();
      }
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [confirmDiscard, isDirty]);

  return { confirmDiscard, suspendProtection, resumeProtection };
}
