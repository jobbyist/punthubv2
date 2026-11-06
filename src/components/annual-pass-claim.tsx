import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import {
  getPassPaymentStatus,
  startAnnualPassCheckout,
  type StartCheckoutResult,
} from "@/lib/annual-pass.functions";

const SPOTS = 20;
const DEADLINE = "16 November 2026";

type Offer = { remaining: number; open: boolean };
type MyClaim = { status: "pending" | "paid"; hold_expires_at: string | null } | null;

// New functions and table: types.ts is regenerated after the migration, so read them through a loose view.
const db = supabase as unknown as {
  rpc: (fn: string) => Promise<{ data: unknown }>;
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };
};

/** Submits the PayFast form the server signed. */
function postToCheckout(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/**
 * Founding Annual Pass: first 20 founding members to claim before 16 November 2026. Claiming includes payment
 * (R299 once-off, PayFast); a claim holds the place for 48 hours until payment is received.
 */
export function AnnualPassClaim({
  onboarding = false,
  compact = onboarding,
}: {
  onboarding?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation("founding");
  const { isSignedIn, profile } = useSession();
  const start = useServerFn(startAnnualPassCheckout);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartCheckoutResult | null>(null);
  const [tick, setTick] = useState(0);

  const { data: offer } = useAsync(async () => {
    const { data } = await db.rpc("annual_pass_offer");
    return (data as Offer | null) ?? null;
  }, [tick]);
  const { data: payments } = useAsync(() => getPassPaymentStatus(), []);
  const { data: mine } = useAsync(async (): Promise<MyClaim> => {
    if (!profile) return null;
    const { data } = await db
      .from("annual_pass_claims")
      .select("status, hold_expires_at")
      .eq("user_id", profile.id)
      .maybeSingle();
    return (data as MyClaim) ?? null;
  }, [profile?.id, tick]);

  const claim = async () => {
    setBusy(true);
    try {
      const r = await start();
      setResult(r);
      if (r.ok) postToCheckout(r.checkoutUrl, r.fields);
    } catch {
      setResult({ ok: false, reason: "error" });
    } finally {
      setBusy(false);
      setTick((n) => n + 1);
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
      })
    : "";

  let message: string | null = null;
  if (mine?.status === "paid") message = t("pass.paid");
  else if (offer && !offer.open && !holdValid)
    message = offer.remaining === 0 ? t("pass.full", params) : t("pass.closed", params);

  if (onboarding && mine?.status === "paid") return null;

  const reasonText =
    result && !result.ok
      ? result.reason === "payments_not_open"
        ? t("pass.paymentsSoon")
        : result.reason === "checkout_unavailable"
          ? t("pass.unavailable")
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
          <span className="text-xs font-semibold text-primary tnum">
            {t("pass.left", { count: offer.remaining })}
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
            {payments?.paymentsOpen ? (
              <Button onClick={claim} disabled={busy} size="lg" className="h-11 px-6">
                {busy ? t("pass.claiming") : t("pass.claim")}
              </Button>
            ) : (
              <p className="text-sm">{t("pass.paymentsSoon")}</p>
            )}
          </>
        ) : (
          <Button asChild size="lg" className="h-11 px-6">
            <Link to="/join">{t("pass.join")}</Link>
          </Button>
        )}
        {reasonText && <p className="text-sm text-muted-foreground">{reasonText}</p>}
      </div>
    </section>
  );
}
