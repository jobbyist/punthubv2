import { Link } from "@tanstack/react-router";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

const SPOTS = 20;
const DEADLINE = "16 November 2026";

type Offer = { remaining: number; open: boolean };
type Claim = {
  status: "claimed" | "already" | "full" | "closed" | "not_member";
  position?: number;
};

// The offer functions are new; types.ts is regenerated after the migration, so call them through a loose view.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
) => Promise<{ data: unknown; error: unknown }>;

/** Limited Annual Pass offer: the first 20 founding members to claim before 16 November 2026. Reserves, takes no payment. */
export function AnnualPassClaim() {
  const { t } = useTranslation("founding");
  const { isSignedIn, profile } = useSession();
  const [result, setResult] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data: offer } = useAsync(async () => {
    const { data } = await rpc("annual_pass_offer");
    return (data as Offer | null) ?? null;
  }, [result?.status]);

  const claim = async () => {
    setBusy(true);
    setFailed(false);
    const { data, error } = await rpc("claim_annual_pass");
    setBusy(false);
    if (error || !data) setFailed(true);
    else setResult(data as Claim);
  };

  const params = {
    spots: SPOTS,
    deadline: DEADLINE,
    position: result?.position,
    count: offer?.remaining ?? 0,
  };
  const status = result?.status;
  const message =
    status === "claimed" || status === "already"
      ? t(`pass.${status}`, params)
      : status === "full" || (offer && !offer.open && offer.remaining === 0)
        ? t("pass.full", params)
        : status === "closed" || (offer && !offer.open)
          ? t("pass.closed", params)
          : null;

  return (
    <section
      id="annual-pass"
      className="mt-12 border border-primary p-6"
      aria-labelledby="annual-pass-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="annual-pass-title" className="text-xl">
          {t("pass.title")}
        </h2>
        {offer?.open && (
          <span className="text-xs font-semibold text-primary tnum">
            {t("pass.left", { count: offer.remaining })}
          </span>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">{t("pass.body", params)}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("pass.note")}</p>
      <div className="mt-4" aria-live="polite">
        {message ? (
          <p className="text-sm font-semibold">{message}</p>
        ) : isSignedIn && profile ? (
          <Button onClick={claim} disabled={busy} size="lg" className="h-11 px-6">
            {busy ? t("pass.claiming") : t("pass.claim")}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link to="/join" onClick={() => analytics.foundingCtaClicked("pass")}>
                {t("pass.join")}
              </Link>
            </Button>
          </div>
        )}
        {failed && <p className="mt-2 text-sm text-destructive">{t("pass.error")}</p>}
      </div>
    </section>
  );
}
