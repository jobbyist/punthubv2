import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { PageSkeleton } from "@/components/motion/page-skeleton";
import { routeTree } from "./routeTree.gen";

/**
 * App-like navigation:
 * - Intent preloading: a page's code and data start loading on hover, focus or touchstart, so the tap lands on a page
 *   that is already there.
 * - Loader data stays fresh for 30 seconds, so back/forward and repeat visits render instantly from cache and refresh
 *   in the background after that.
 * - A slow page shows a layout skeleton after 150 ms instead of a frozen screen; fast pages never flash it.
 * - Same-document view transitions crossfade the content while the header and dock stay put (see styles.css).
 */
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultPendingMs: 150,
    defaultPendingMinMs: 250,
    defaultPendingComponent: PageSkeleton,
    defaultViewTransition: true,
  });

  return router;
};
