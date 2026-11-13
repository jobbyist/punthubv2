import { useRouterState } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { MfaChallenge } from "@/components/mfa-challenge";
import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";
import { mfaRequired } from "@/lib/mfa";

/**
 * A member with two-step verification on must enter their authenticator code before using any page. /join handles
 * it inside the sign-in card; everywhere else this full-screen prompt appears (after a magic link, an OAuth return,
 * a restored session or a new tab). The database refuses admin access and redemptions until the code is entered.
 */
export function MfaGate() {
  const { t } = useTranslation("security");
  const { user, refreshSecurity } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    if (!user) {
      setNeeded(false);
      return;
    }
    let live = true;
    void mfaRequired().then((r) => live && setNeeded(r));
    return () => {
      live = false;
    };
  }, [user, path]);

  if (!needed || path.startsWith("/join")) return null;
  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-background/95 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={t("mfa.challenge.title")}
    >
      <div className="card-surface w-full max-w-sm p-6">
        <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
        <div className="mt-3">
          <MfaChallenge
            onVerified={() => {
              setNeeded(false);
              void refreshSecurity();
            }}
            onCancel={() => {
              void supabase.auth.signOut();
              setNeeded(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
