import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/** The pages people open most from the dock and header. Their code is fetched while the browser is idle. */
const WARM_PATHS = [
  "/discover",
  "/fixtures",
  "/predictions",
  "/results",
  "/leaderboards",
  "/newsroom",
  "/join",
] as const;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};
type NetworkNavigator = Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };

/**
 * Warms the JavaScript of the main pages once the current page is idle, so the first tap on any of them renders
 * without a network round trip for code. Only code is fetched (no loaders, no personal data), and nothing at all on
 * Save-Data or 2G connections.
 */
export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const conn = (navigator as NetworkNavigator).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) return;
    const w = window as IdleWindow;
    let cancelled = false;
    const warm = async () => {
      for (const path of WARM_PATHS) {
        if (cancelled) return;
        if (path === window.location.pathname) continue;
        const route = (router.routesByPath as unknown as Record<string, unknown>)[path];
        if (!route) continue;
        try {
          await router.loadRouteChunk(route as Parameters<typeof router.loadRouteChunk>[0]);
        } catch {
          /* a failed warm-up is harmless: the page loads normally on tap */
        }
      }
    };
    const start = () => void warm();
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(start, { timeout: 4000 })
      : window.setTimeout(start, 2500);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [router]);

  return null;
}
