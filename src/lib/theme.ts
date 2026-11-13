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

/**
 * Runs in <head> before the page paints, so there is no flash of the wrong theme, and hides the preloader for the
 * rest of the session once it has been shown. Kept tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");if(sessionStorage.getItem("${PRELOADED_KEY}"))d.setAttribute("data-preloaded","1");}catch(e){}})();`;
