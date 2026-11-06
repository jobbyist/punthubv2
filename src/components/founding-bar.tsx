import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { formatDate } from "@/lib/format";
import { DEFAULT_LAUNCH_DATE } from "@/lib/launch";
import { getFoundingSpots } from "@/lib/founding.functions";
import { supabase } from "@/integrations/supabase/client";

const ANNUAL_PASS_CAP = 20;
type ScarcityCounts = { foundingClaimed: number; foundingCap: number; annualPassRemaining: number };

async function fetchScarcityCounts(): Promise<ScarcityCounts | null> {
  const [founding, annual] = await Promise.all([
    getFoundingSpots(),
    supabase.rpc("annual_pass_offer"),
  ]);
  if (!founding || annual.error || !annual.data) return null;

  const offer = annual.data as unknown as { remaining?: number; open?: boolean };
  if (typeof offer.remaining !== "number" || typeof offer.open !== "boolean") return null;

  return {
    foundingClaimed: Math.min(founding.cap, Math.max(0, founding.taken)),
    foundingCap: founding.cap,
    annualPassRemaining: Math.min(ANNUAL_PASS_CAP, Math.max(0, offer.remaining)),
  };
}

/** Sitewide founding strip. Counts are fetched from the live founding and Annual Pass RPCs; never hard-coded. */
export function FoundingBar() {
  const { t } = useTranslation("common");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [counts, setCounts] = useState<ScarcityCounts | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await fetchScarcityCounts().catch((error) => {
        console.error("Founding scarcity counts unavailable", error);
        return null;
      });
      if (active) setCounts(next);
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (path === "/join" || path === "/founding" || path.startsWith("/admin")) return null;

  const launch = formatDate(`${DEFAULT_LAUNCH_DATE}T12:00:00+02:00`);
  const foundingText = counts
    ? `Founding Sign-Ups: ${counts.foundingClaimed} of ${counts.foundingCap} spots claimed`
    : t("foundingBar.text", { launch });
  const annualText = counts
    ? ` · ${counts.annualPassRemaining} of ${ANNUAL_PASS_CAP} Annual Passes remaining`
    : "";

  return (
    <div className="bg-foreground px-3 py-2.5 text-center text-[11px] leading-snug text-background sm:px-4 sm:py-2 sm:text-sm">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <span className="font-semibold" aria-live="polite">
          {foundingText}
          {annualText}
        </span>
        <Link
          to="/founding"
          className="inline-flex shrink-0 items-center font-bold text-primary underline underline-offset-2"
        >
          {t("foundingBar.cta")}
        </Link>
      </div>
    </div>
  );
}
