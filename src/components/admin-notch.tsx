import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";

const KEY = "puntr:admin-notch";
const SNOOZE_MS = 7 * 24 * 3600 * 1000;

/**
 * A slim tab docked to the middle of the right edge that opens the admin portal. Shown only to signed-in admins
 * (the portal itself still checks is_admin() on every request) and never inside the portal. Dismissing hides it for a
 * week on this browser. Hidden until after mount so the server and client render the same markup.
 */
export function AdminNotch() {
  const { t } = useTranslation("common");
  const { isAdmin } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let snoozed = false;
    try {
      snoozed = Date.now() - Number(localStorage.getItem(KEY) ?? 0) < SNOOZE_MS;
    } catch {
      // Storage blocked: show it each visit.
    }
    setHidden(snoozed);
    setReady(true);
  }, []);

  const show =
    ready && isAdmin && !hidden && !path.startsWith("/admin") && !path.startsWith("/join");

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="admin-notch"
          aria-label={t("adminNotch.label")}
          className="group fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-stretch shadow-soft"
          initial={reduce ? false : { x: "100%" }}
          animate={{ x: 0 }}
          exit={reduce ? { opacity: 0 } : { x: "100%" }}
          transition={{ type: "spring", stiffness: 140, damping: 18, delay: reduce ? 0 : 0.6 }}
        >
          <button
            type="button"
            aria-label={t("adminNotch.dismiss")}
            title={t("adminNotch.dismiss")}
            className="grid w-6 place-items-center border-y border-l border-primary bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            onClick={() => {
              try {
                localStorage.setItem(KEY, String(Date.now()));
              } catch {
                // Not saved: the tab returns on the next visit.
              }
              setHidden(true);
            }}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
          <Link
            to="/admin"
            aria-label={t("adminNotch.open")}
            className="relative flex flex-col items-center gap-3 bg-primary px-2 py-4 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="relative grid place-items-center">
              {!reduce && (
                <motion.span
                  aria-hidden="true"
                  className="absolute size-7 border border-primary-foreground/60"
                  animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <ShieldCheck className="relative size-5" aria-hidden="true" />
            </span>
            <span
              className="font-display text-xs font-bold uppercase tracking-[0.2em] [text-orientation:mixed] [writing-mode:vertical-rl]"
              style={{ transform: "rotate(180deg)" }}
            >
              {t("adminNotch.label")}
            </span>
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
