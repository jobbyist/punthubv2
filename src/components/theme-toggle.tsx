import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
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

  const toggle = () => {
    const next: ThemeChoice = mode === "dark" ? "light" : "dark";
    applyTheme(next);
    setMode(next);
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
