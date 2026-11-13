import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountPage } from "@/components/account-gate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeNext } from "@/lib/email/auth-emails";

const TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
type ConfirmType = (typeof TYPES)[number];

const DEFAULT_NEXT: Record<ConfirmType, string> = {
  signup: "/join",
  invite: "/join",
  magiclink: "/join",
  email: "/join",
  recovery: "/reset-password",
  email_change: "/account/security",
};

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { token_hash?: string; type?: string; next?: string } => ({
    ...(typeof s["token_hash"] === "string" ? { token_hash: s["token_hash"].slice(0, 200) } : {}),
    ...(typeof s["type"] === "string" ? { type: s["type"].slice(0, 20) } : {}),
    ...(typeof s["next"] === "string" ? { next: s["next"].slice(0, 200) } : {}),
  }),
  head: () => ({
    meta: [{ title: "Confirm | Puntr" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Confirm,
});

/**
 * Landing page for links in Puntr's auth emails. It verifies only when the member taps the button, so a mail
 * scanner that opens the link cannot use it up.
 */
function Confirm() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { token_hash: tokenHash, type, next } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = Boolean(tokenHash) && (TYPES as readonly string[]).includes(type ?? "");
  const kind = (valid ? type : "magiclink") as ConfirmType;

  const go = async () => {
    if (!valid || !tokenHash) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: kind as EmailOtpType,
    });
    setBusy(false);
    if (err) return setError(err.status === 429 ? t("join.error.rate") : t("confirm.expired"));
    const target = safeNext(next, DEFAULT_NEXT[kind]);
    // Recovery always lands on the reset form, whatever the link said.
    void navigate({ to: kind === "recovery" ? "/reset-password" : target });
  };

  return (
    <AccountPage>
      <h1 className="text-3xl">{t(`confirm.title.${kind}`)}</h1>
      {!valid ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t("confirm.invalid")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t(`confirm.body.${kind}`)}</p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="mt-5" disabled={busy} onClick={() => void go()}>
            {busy ? t("confirm.working") : t("confirm.continue")}
          </Button>
        </>
      )}
      <p className="mt-6 text-sm">
        <Link
          to={kind === "recovery" ? "/reset-password" : "/join"}
          className="text-primary underline"
        >
          {kind === "recovery" ? t("confirm.newReset") : t("confirm.newCode")}
        </Link>
      </p>
    </AccountPage>
  );
}
