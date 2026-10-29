import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";

const KEY = "puntr:security-prompt";
const SNOOZE_MS = 3 * 24 * 3600 * 1000;

/** A slim, dismissible nudge for members who have not confirmed their email or turned on two-factor sign-in. */
export function SecurityPrompt() {
  const { t } = useTranslation("security");
  const { user, profile, emailConfirmed, hasMfa } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [snoozed, setSnoozed] = useState(true);

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(KEY) ?? 0);
      setSnoozed(Date.now() - at < SNOOZE_MS);
    } catch {
      setSnoozed(false);
    }
  }, []);

  if (!profile || snoozed || path.startsWith("/join") || path.startsWith("/account/security")) {
    return null;
  }
  const message = !emailConfirmed ? t("prompt.confirm") : hasMfa === false ? t("prompt.mfa") : null;
  if (!message) return null;

  return (
    <div role="status" className="border-b border-border bg-primary-soft">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <span className="min-w-0 flex-1">{message}</span>
        <Link to="/account/security" className="font-semibold text-primary underline">
          {t("prompt.cta")}
        </Link>
        <button
          type="button"
          className="text-muted-foreground underline"
          onClick={() => {
            try {
              localStorage.setItem(KEY, String(Date.now()));
            } catch {
              // Not saved: the prompt returns on the next visit.
            }
            setSnoozed(true);
          }}
        >
          {t("prompt.later")}
        </button>
      </div>
    </div>
  );
}
