import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { applyTheme, readTheme, resolvedTheme, type ThemeChoice } from "@/lib/theme";

/** Sun/moon switch in the header. Follows the device until the member picks a theme. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useTranslation("nav");
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const choice = readTheme();
    setMode(resolvedTheme(choice));
    if (choice !== "system") return;
    // Follow the device while no choice is stored.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") {
        applyTheme("system", true);
        setMode(resolvedTheme("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next: ThemeChoice = mode === "dark" ? "light" : "dark";
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      applyTheme(next);
      setMode(next);
      return;
    }
    // The new theme spreads out in a circle from the toggle (View Transitions); other browsers just switch.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    root.classList.add("theme-vt");
    const vt = doc.startViewTransition(() => {
      applyTheme(next, false);
      setMode(next);
    });
    vt.ready
      .then(
        () =>
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            {
              duration: 520,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            },
          ).finished,
      )
      .catch(() => undefined)
      .finally(() => root.classList.remove("theme-vt"));
  };

  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      title={dark ? t("theme.toLight") : t("theme.toDark")}
      className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border text-foreground transition-colors hover:bg-muted ${className}`}
    >
      <Sun
        className={`absolute size-[18px] transition-all duration-300 ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        aria-hidden="true"
      />
      <Moon
        className={`absolute size-[18px] transition-all duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
        aria-hidden="true"
      />
    </button>
  );
}
