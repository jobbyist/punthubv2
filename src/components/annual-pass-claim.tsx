import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { reserveAnnualPass, type ReserveAnnualPassResult } from "@/lib/annual-pass.functions";

const SPOTS = 20;
const DEADLINE = "16 November 2026";

type Offer = { remaining: number; open: boolean };
type MyClaim = { status: "pending" | "paid"; hold_expires_at: string | null } | null;

const db = supabase as unknown as {
  rpc: (fn: string) => Promise<{ data: unknown }>;
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };
};

/** Reservation-first Annual Pass: no payment is collected on Puntr. */
export function AnnualPassClaim({
  onboarding = false,
  compact = onboarding,
}: {
  onboarding?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation("founding");
  const { isSignedIn, profile } = useSession();
  const reserve = useServerFn(reserveAnnualPass);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReserveAnnualPassResult | null>(null);
  const [tick, setTick] = useState(0);

  const { data: offer } = useAsync(async () => {
    const { data } = await db.rpc("annual_pass_offer");
    return (data as Offer | null) ?? null;
  }, [tick]);
  const { data: mine } = useAsync(async (): Promise<MyClaim> => {
    if (!profile) return null;
    const { data } = await db
      .from("annual_pass_claims")
      .select("status, hold_expires_at")
      .eq("user_id", profile.id)
      .maybeSingle();
    return (data as MyClaim) ?? null;
  }, [profile?.id, tick]);

  const submitReservation = async () => {
    setBusy(true);
    try {
      const response = await reserve();
      setResult(response);
      setTick((n) => n + 1);
    } catch {
      setResult({ ok: false, reason: "error" });
    } finally {
      setBusy(false);
    }
  };

  const params = { spots: SPOTS, deadline: DEADLINE, count: offer?.remaining ?? 0 };
  const holdValid =
    mine?.status === "pending" &&
    !!mine.hold_expires_at &&
    new Date(mine.hold_expires_at).getTime() > Date.now();
  const until = mine?.hold_expires_at
    ? new Date(mine.hold_expires_at).toLocaleString(i18n.language, {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Johannesburg",
      })
    : "";

  let message: string | null = null;
  if (mine?.status === "paid") message = t("pass.paid");
  else if (offer && !offer.open && !holdValid)
    message = offer.remaining === 0 ? t("pass.full", params) : t("pass.closed", params);

  if (onboarding && mine?.status === "paid") return null;

  const reasonText =
    result && !result.ok
      ? result.reason === "email_not_configured"
        ? t("pass.emailNotConfigured")
        : result.reason === "email_failed"
          ? t("pass.emailFailed")
          : result.reason === "missing_email"
            ? t("pass.missingEmail")
            : result.reason === "full"
              ? t("pass.full", params)
              : result.reason === "closed"
                ? t("pass.closed", params)
                : result.reason === "already_paid"
                  ? t("pass.paid")
                  : t("pass.error")
      : null;

  return (
    <section
      id="annual-pass"
      className={compact ? "border border-primary p-4" : "mt-12 border border-primary p-6"}
      aria-labelledby="annual-pass-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="annual-pass-title" className={compact ? "text-lg" : "text-xl"}>
          {onboarding ? t("pass.onboardingTitle") : t("pass.title")}
        </h2>
        {offer?.open && (
          <span className="text-xs font-semibold text-primary tnum" aria-live="polite">
            {t("pass.leftOf", { count: offer.remaining, total: SPOTS })}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("pass.body", params)}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("pass.note")}</p>
      <div className="mt-4 space-y-2" aria-live="polite">
        {message ? (
          <p className="text-sm font-semibold">{message}</p>
        ) : isSignedIn && profile ? (
          <>
            {holdValid && <p className="text-sm font-semibold">{t("pass.pending", { until })}</p>}
            <Button onClick={submitReservation} disabled={busy} size="lg" className="h-11 px-6">
              {busy ? t("pass.reserving") : holdValid ? t("pass.resendEmail") : t("pass.reserve")}
            </Button>
            {result?.ok && (
              <p className="text-sm font-semibold text-primary">
                {t("pass.emailSent", {
                  until: new Date(result.holdExpiresAt).toLocaleString(i18n.language, {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Johannesburg",
                  }),
                })}
              </p>
            )}
          </>
        ) : (
          <Button asChild size="lg" className="h-11 px-6">
            <Link to="/join" onClick={() => analytics.foundingCtaClicked("pass")}>
              {t("pass.join")}
            </Link>
          </Button>
        )}
        {reasonText && <p className="text-sm text-muted-foreground">{reasonText}</p>}
      </div>
    </section>
  );
}
