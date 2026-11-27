/** Light/dark theme. Choice stored per browser ("light" | "dark" | "system"); default follows the device. */
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_KEY = "puntr-theme";
export const PRELOADED_KEY = "puntr-preloaded";

export function resolvedTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice, animate = true): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
  }
  root.classList.toggle("dark", resolvedTheme(choice) === "dark");
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}

export const SPLASH_KEY = "puntr-splash";

/** Marketing pages that open with the branded preloader on the first visit of a browser session. */
export const MARKETING_PATHS = [
  "/",
  "/about",
  "/founding",
  "/how-it-works",
  "/pricing",
  "/roadmap",
  "/rewards",
  "/newsroom",
] as const;

export function isMarketingPath(path: string): boolean {
  return path.startsWith("/sports/") || (MARKETING_PATHS as readonly string[]).includes(path);
}

/**
 * Runs in <head> before the page paints, so there is no flash of the wrong theme, and decides whether the branded
 * splash covers this page load: `data-splash="app"` on every launch of the installed app (any page), and
 * `data-splash="web"` on the first marketing page of a browser session. Kept tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");var sa=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true,p=location.pathname,s=sessionStorage;if(sa){d.setAttribute("data-standalone","1");if(!s.getItem("${SPLASH_KEY}"))d.setAttribute("data-splash","app");}else if((p.indexOf("/sports/")===0||${JSON.stringify(MARKETING_PATHS)}.indexOf(p)>-1)&&!s.getItem("${PRELOADED_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.setAttribute("data-splash","web");}catch(e){}})();`;
