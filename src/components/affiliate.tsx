import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PartnerLogo } from "@/components/partner-logo";
import { RgNotice } from "@/components/rg-notice";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { platforms } from "@/lib/mock-data";
import { AFFILIATES_ENABLED } from "@/lib/flags";
import { trackEvent } from "@/lib/analytics";

type PublicAffiliatePartner = {
  id: string;
  name: string;
  tracking_link: string;
  website_url: string | null;
};

/**
 * Sponsored bookmaker placements. The public view exposes only live partner names and tracking URLs;
 * commission terms, contacts and internal notes remain admin-only. A session-level 18+ attestation
 * is required before links are revealed.
 */
export function AffiliateBanner({ label = "homepage" }: { label?: string }) {
  const { t } = useTranslation("affiliate");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const { data } = useAsync(async () => {
    if (!AFFILIATES_ENABLED) return [] as PublicAffiliatePartner[];
    const { data: rows, error } = await supabase
      .from("public_affiliate_partners")
      .select("id, name, tracking_link, website_url")
      .order("name");
    if (error) throw error;
    return (rows ?? []) as PublicAffiliatePartner[];
  }, []);

  useEffect(() => {
    try {
      setAgeConfirmed(window.sessionStorage.getItem("puntr:affiliate-age-confirmed") === "yes");
    } catch {
      setAgeConfirmed(false);
    }
  }, []);

  if (!AFFILIATES_ENABLED || !data?.length) return null;

  const confirmAge = () => {
    try {
      window.sessionStorage.setItem("puntr:affiliate-age-confirmed", "yes");
    } catch {
      // The confirmation still applies for this mounted page if session storage is unavailable.
    }
    setAgeConfirmed(true);
  };

  return (
    <section aria-label="Puntr bookmaker partners" className="card-surface border-primary/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">{t("placement.eyebrow")}</p>
            <h2 className="mt-1 text-lg font-bold">{t("placement.title")}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {t("placement.description")}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Affiliate links
        </span>
      </div>

      {!ageConfirmed ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
          <p className="text-sm font-medium">{t("placement.agePrompt")}</p>
          <button
            type="button"
            onClick={confirmAge}
            className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            I confirm I am 18+
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.map((partner) => {
            const logo = platforms.find((p) => p.name.toLowerCase() === partner.name.toLowerCase())?.logo;
            return (
              <a
                key={partner.id}
                href={partner.tracking_link}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                onClick={() => trackEvent("affiliate_partner_click", { partner_id: partner.id, partner_name: partner.name, placement: label })}
                className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary-soft/30"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {logo ? (
                    <PartnerLogo src={logo} alt={partner.name} loading="lazy" className="h-9 w-16 shrink-0" />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-black">
                      {partner.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{partner.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{t("placement.visit")}</span>
                  </span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Affiliate disclosure: {t("disclosure.short")}{" "}
          <Link to="/affiliate-disclosure" className="font-semibold text-foreground underline underline-offset-2">Read the full disclosure</Link>.
        </p>
        <RgNotice variant="compact" className="mt-2" />
      </div>
    </section>
  );
}

export function PlatformRail() {
  const { t } = useTranslation("affiliate");
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {platforms.slice(0, 9).map((p) => (
        <div
          key={p.name}
          className="card-surface group grid h-16 min-w-[100px] flex-1 place-items-center px-3 shadow-soft transition-transform hover:-translate-y-0.5 sm:min-w-[130px] sm:px-5"
        >
          <PartnerLogo
            src={p.logo}
            alt={t("logoAlt", { name: p.name })}
            loading="lazy"
            className="w-auto"
          />
        </div>
      ))}
    </div>
  );
}
