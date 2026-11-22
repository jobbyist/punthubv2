import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export const AUTH_RETURN_STORAGE_KEY = "puntr:auth-return-path";

/** Remembers the last safe in-app destination before a user enters authentication. */
export function AuthReturnTracker() {
  const href = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    try {
      const url = new URL(href, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname === "/join" ||
        url.pathname.startsWith("/auth/") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/reset-password") ||
        url.pathname.startsWith("/logout")
      ) {
        return;
      }
      window.sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, url.pathname + url.search + url.hash);
    } catch {
      // Authentication falls back to /predictions when storage is unavailable.
    }
  }, [href]);

  return null;
}
