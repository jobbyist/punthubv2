import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PRELOADED_KEY } from "@/lib/theme";

/** Marketing pages that open with the branded preloader on the first visit of a session. */
export function isMarketingPath(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/sports/") ||
    [
      "/about",
      "/founding",
      "/how-it-works",
      "/pricing",
      "/roadmap",
      "/rewards",
      "/newsroom",
    ].includes(path)
  );
}

const MIN_MS = 900;
const MAX_MS = 2400;

/**
 * Full-screen preloader: Puntr logo, animated slogan and a loading bar. Rendered in the server HTML so it covers the
 * first paint, shown once per browser session, removed when the page has loaded (between 0.9 and 2.4 seconds).
 * A CSS fallback fades it out even without JavaScript; prefers-reduced-motion hides it entirely.
 */
export function Preloader() {
  const { t } = useTranslation("common");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(standaloneMode);
    // Only a marketing page shows (¶»§q«^