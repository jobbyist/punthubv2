import { ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PartnerLogo } from "@/components/partner-logo";
import { RgNotice } from "@/components/rg-notice";
import { AdFreeLink, SponsoredLabel } from "@/components/ads/ad-units";
import { recordAdEvent, useAds } from "@/components/ads/ads-provider";
import { platforms } from "@/lib/mock-data";
import { trackEvent } from "@/lib/analytics";

/**
 * Sponsored bookmaker placements. The public view exposes only live partner names and tracking URLs;
 * commission terms, contacts and internal notes remain admin-only. An 18+ confirmation (session or profile)
 * is required before links are revealed. Puntr Pro members and members on a break never see it.
 */
export function AffiliateBanner({ label = "homepage" }: { label?: string }) {
  const { t } = useTranslation("affiliate");
  const ads = useAds();
  const data = ads.partners;
  const ageConfirmed = ads.ageConfirmed;

  if (!ads.eligible) return null;

  const confirmAge = ads.confirmAge;

  return (
    <section
      aria-label="Puntr bookmaker partners"
      className="card-surface border-primary/25 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              {t("placement.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-bold">{t("placement.title")}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {t("placement.description")}
            </p>
          </div>
        </div>
        <SponsoredLabel />
      </div>

      {!ageConfirmed ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
          <p className="text-sm font-medium">{t("placement.agePrompt")}</p>
          <button
            type="button"
            onClick={confirmAge}
            className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            {t("placement.confirm")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.map((partner) => {
            const logo = ads.logoFor(partner.name, partner.slug);
            return (
              <a
                key={partner.id}
                href={partner.tracking_link}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                onClick={() => {
                  recordAdEvent(partner.id, null, label, "click");
                  trackEvent("affiliate_partner_click", {
                    partner_id: partner.id,
                    partner_name: partner.name,
                    placement: label,
                  });
                }}
                className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/50 hover:bg-primary-soft/30"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {logo ? (
                    <PartnerLogo
                      src={logo}
                      alt={partner.name}
                      loading="lazy"
                      className="h-9 w-16 shrink-0"
                    />
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-black">
                      {partner.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{partner.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {t("placement.visit")}
                    </span>
                  </span>
                </span>
                <ExternalLink
                  className="size-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Affiliate disclosure: {t("disclosure.short")}{" "}
          <Link
            to="/affiliate-disclosure"
            className="font-semibold text-foreground underline underline-offset-2"
          >
            Read the full disclosure
          </Link>
          .
        </p>
        <RgNotice variant="compact" className="mt-2" />
        <AdFreeLink className="mt-2" />
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
