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

  useEffect(() => {
    if (document.documentElement.hasAttribute("data-preloaded")) {
      setState("gone");
      return;
    }
    const started = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      window.setTimeout(() => {
        setState("leaving");
        try {
          sessionStorage.setItem(PRELOADED_KEY, "1");
        } catch {
          /* ignore */
        }
        window.setTimeout(() => setState("gone"), 380);
      }, wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const cap = window.setTimeout(finish, MAX_MS);
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(cap);
    };
  }, []);

  if (state === "gone" || !isMarketingPath(path)) return null;
  const words = t("preloader.slogan").split(" ");

  return (
    <div
      className="puntr-preloader fixed inset-0 z-[100] grid place-items-center bg-background"
      data-done={state === "leaving" ? "true" : undefined}
      role="status"
      aria-label={t("preloader.label")}
    >
      <div className="flex w-64 flex-col items-center text-center">
        <img src="/puntrlogorounded.png" alt="" className="logo size-20" width={80} height={80} />
        <p className="mt-5 font-display text-lg font-extrabold tracking-tight">
          {words.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className={`word ${i >= words.length - 2 ? "text-primary" : ""}`}
              style={{ animationDelay: `${250 + i * 110}ms` }}
            >
              {w}&nbsp;
            </span>
          ))}
        </p>
        <div className="mt-5 h-1 w-full overflow-hidden bg-muted">
          <div className="bar h-full bg-primary" />
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {t("preloader.tag")}
        </p>
      </div>
    </div>
  );
}
