import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PRELOADED_KEY, SPLASH_KEY } from "@/lib/theme";

const MIN_MS = { app: 1100, web: 1000 } as const;
const MAX_MS = 2600;
const EXIT_MS = 420;

/**
 * Branded splash and preloader. It is rendered in the server HTML on every page and stays hidden unless the head boot
 * script (THEME_BOOT_SCRIPT) set `data-splash` on <html> before the first paint:
 *  - "app": every launch of the installed PWA, on any page. The logo sits exactly where the iOS launch image and the
 *    Android system splash put it, so the hand-over is seamless; the slogan and loading bar then animate in.
 *  - "web": the first marketing page of a browser session, with a logo reveal.
 * Removed once the page has loaded (between MIN_MS and 2.6 seconds). A CSS fallback fades it out even if JavaScript
 * fails; prefers-reduced-motion keeps it still and short.
 */
export function Preloader() {
  const { t } = useTranslation("common");
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    const root = document.documentElement;
    const mode = root.getAttribute("data-splash") as "app" | "web" | null;
    if (!mode) {
      setState("gone");
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minMs = reduced ? 350 : MIN_MS[mode];
    const started = performance.now();
    let done = false;
    let exitTimer = 0;
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, minMs - (performance.now() - started));
      exitTimer = window.setTimeout(() => {
        setState("leaving");
        try {
          sessionStorage.setItem(mode === "app" ? SPLASH_KEY : PRELOADED_KEY, "1");
        } catch {
          /* private mode: shown again next load */
        }
        exitTimer = window.setTimeout(() => {
          root.removeAttribute("data-splash");
          setState("gone");
        }, EXIT_MS);
      }, wait);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const cap = window.setTimeout(finish, MAX_MS);
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(cap);
      window.clearTimeout(exitTimer);
    };
  }, []);

  if (state === "gone") return null;
  const words = t("preloader.slogan").split(" ");

  return (
    <div
      className="puntr-preloader fixed inset-0 z-[100] bg-background"
      data-done={state === "leaving" ? "true" : undefined}
      role="status"
      aria-label={t("preloader.label")}
    >
      <div className="glow" aria-hidden="true" />
      <div className="logo-wrap">
        <img
          src="/brand/puntr-wordmark.png"
          alt=""
          width={652}
          height={206}
          className="logo dark:hidden"
          fetchPriority="high"
          decoding="sync"
        />
        <img
          src="/brand/puntr-wordmark-dark.png"
          alt=""
          width={652}
          height={206}
          className="logo hidden dark:block"
          fetchPriority="high"
          decoding="sync"
        />
        <span className="sheen" aria-hidden="true" />
      </div>
      <div className="below">
        <p className="font-display text-base font-extrabold tracking-tight sm:text-lg">
          {words.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className={`word ${i >= words.length - 2 ? "text-primary" : ""}`}
              style={{ animationDelay: `${180 + i * 90}ms` }}
            >
              {w}&nbsp;
            </span>
          ))}
        </p>
        <div className="track mt-5 h-[3px] w-40 overflow-hidden bg-muted">
          <div className="bar h-full bg-primary" />
        </div>
        <p className="tag mt-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]">
          {t("preloader.tag")}
        </p>
      </div>
    </div>
  );
}
