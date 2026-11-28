import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { recordAdEvent, useAds } from "@/components/ads/ads-provider";
import { RgNotice } from "@/components/rg-notice";
import { useConsentBannerPending } from "@/hooks/use-overlay-slot";
import {
  OVERLAY_SECONDS,
  overlayAllowedOn,
  overlayDue,
  parseOverlayState,
  pickAdUnit,
  slotRoll,
  type AdFormat,
  type AdUnit,
} from "@/lib/ads";
import { trackEvent } from "@/lib/analytics";

const OVERLAY_KEY = "puntr:ads:overlay";
/** One count per page view: effects can run twice for the same path (dev StrictMode, hydration). */
let lastCounted = { path: "", at: 0 };

/** Every paid unit carries one of these two labels (owner rule, 28 Nov 2026). */
export function SponsoredLabel({
  kind = "sponsored",
  className = "",
}: {
  kind?: "sponsored" | "advertisement";
  className?: string;
}) {
  const { t } = useTranslation("affiliate");
  return (
    <span
      className={`inline-flex items-center border border-foreground/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-[0.18em] text-foreground ${className}`}
    >
      {t(kind === "sponsored" ? "ads.sponsored" : "ads.advertisement")}
    </span>
  );
}

/** "Go ad-free with Puntr Pro" link shown on every unit. */
export function AdFreeLink({ className = "" }: { className?: string }) {
  const { t } = useTranslation("affiliate");
  return (
    <Link
      to="/pricing"
      className={`inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground underline-offset-2 hover:text-primary hover:underline ${className}`}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {t("ads.goAdFree")}
    </Link>
  );
}

function useImpression(unit: AdUnit | null, placement: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!unit || !el || seen.current === unit.partnerId + placement) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          seen.current = unit.partnerId + placement;
          recordAdEvent(unit.partnerId, unit.creativeId, placement, "impression");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [unit, placement]);
  return ref;
}

function onAdClick(unit: AdUnit, placement: string) {
  recordAdEvent(unit.partnerId, unit.creativeId, placement, "click");
  trackEvent("affiliate_partner_click", {
    partner_id: unit.partnerId,
    partner_name: unit.partnerName,
    placement,
    creative: unit.creativeId ?? "default",
  });
}

function Logo({ unit, className }: { unit: AdUnit; className: string }) {
  const { logoFor } = useAds();
  const src = unit.imageUrl ?? logoFor(unit.partnerName, unit.partnerSlug);
  if (src) {
    return (
      <span
        className={`grid shrink-0 place-items-center border border-border bg-white p-2 ${className}`}
      >
        <img
          src={src}
          alt={unit.partnerName}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center bg-ink text-sm font-black text-white ${className}`}
    >
      {unit.partnerName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}

/** Compact one-tap 18+ confirmation shown in a slot before any partner link is revealed. */
function AgeGateSlot({ compact }: { compact?: boolean }) {
  const { t } = useTranslation("affiliate");
  const { confirmAge } = useAds();
  return (
    <div
      className={`card-surface flex flex-wrap items-center justify-between gap-3 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SponsoredLabel />
        <p className="text-xs font-medium text-muted-foreground">{t("ads.agePrompt")}</p>
      </div>
      <button
        type="button"
        onClick={confirmAge}
        className="bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
      >
        {t("placement.confirm")}
      </button>
    </div>
  );
}

/**
 * An ad slot. Renders nothing for Puntr Pro members, members on a break, or when no partner is live.
 * `placement` is a short kebab-case id (newsroom-feed, teams-grid, ...) used for rotation and reporting.
 */
export function AdSlot({
  placement,
  format = "card",
  seed = 0,
  className = "",
}: {
  placement: string;
  format?: Exclude<AdFormat, "overlay">;
  /** Distinguishes several slots of the same placement on one page so they rotate partners. */
  seed?: number;
  className?: string;
}) {
  const { t } = useTranslation("affiliate");
  const ads = useAds();
  const unit =
    ads.eligible && ads.ageConfirmed
      ? pickAdUnit(ads, placement, format, slotRoll(placement, seed))
      : null;
  const ref = useImpression(unit, placement);

  if (!ads.eligible) return null;
  if (!ads.ageConfirmed) {
    return format === "text_link" ? null : (
      <div className={className}>
        <AgeGateSlot compact={format === "card"} />
      </div>
    );
  }
  if (!unit) return null;

  const cta = unit.ctaLabel ?? t("ads.defaultCta", { name: unit.partnerName });
  const body = unit.body ?? t("ads.defaultBody", { name: unit.partnerName });
  const terms = unit.termsLine ?? t("ads.defaultTerms");
  const linkProps = {
    href: unit.href,
    target: "_blank",
    rel: "sponsored nofollow noopener noreferrer",
    onClick: () => onAdClick(unit, placement),
  } as const;

  if (format === "text_link") {
    return (
      <div ref={ref} className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
        <SponsoredLabel />
        <a
          {...linkProps}
          className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
        >
          {cta}
        </a>
        <span className="text-muted-foreground">· {terms}</span>
      </div>
    );
  }

  if (format === "banner") {
    return (
      <aside
        ref={ref}
        aria-label={t("ads.aria", { name: unit.partnerName })}
        className={`card-surface relative overflow-hidden border-primary/25 ${className}`}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary"
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
          <SponsoredLabel />
          <AdFreeLink />
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <Logo unit={unit} className="h-14 w-24" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold leading-tight">{unit.headline}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
          <a
            {...linkProps}
            className="group inline-flex shrink-0 items-center justify-center gap-1.5 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            {cta}
            <ArrowUpRight
              className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
        <div className="border-t border-border px-4 py-2 sm:px-5">
          <p className="text-[10px] font-semibold text-muted-foreground">{terms}</p>
          <RgNotice variant="compact" className="text-[10px]" />
        </div>
      </aside>
    );
  }

  // card: sits inside grids and feeds, same footprint as a list item.
  return (
    <aside
      ref={ref}
      aria-label={t("ads.aria", { name: unit.partnerName })}
      className={`card-surface flex h-full flex-col border-primary/25 p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <SponsoredLabel />
        <AdFreeLink />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Logo unit={unit} className="h-11 w-16" />
        <p className="min-w-0 font-display text-base font-extrabold leading-tight">
          {unit.headline}
        </p>
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <a
        {...linkProps}
        className="group mt-3 inline-flex items-center justify-center gap-1.5 bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
      >
        {cta}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </a>
      <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{terms}</p>
      <RgNotice variant="compact" className="text-[10px]" />
    </aside>
  );
}

/**
 * Interstitial between page loads: frequency capped (lib/ads.ts), waits for the cookie banner, never on
 * sign-up, payment, legal or help pages, closes itself after OVERLAY_SECONDS and can be closed at once.
 */
export function AdOverlay() {
  const { t } = useTranslation("affiliate");
  const ads = useAds();
  const consentPending = useConsentBannerPending();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [unit, setUnit] = useState<AdUnit | null>(null);
  const [left, setLeft] = useState(OVERLAY_SECONDS);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const live = useRef({ ads, consentPending });
  live.current = { ads, consentPending };

  // Count page views and decide, per view, whether an interstitial is due.
  useEffect(() => {
    const now = Date.now();
    const repeat = lastCounted.path === path && now - lastCounted.at < 2000;
    lastCounted = { path, at: now };
    let state;
    try {
      state = parseOverlayState(window.sessionStorage.getItem(OVERLAY_KEY));
      if (!repeat) {
        state = { ...state, views: state.views + 1 };
        window.sessionStorage.setItem(OVERLAY_KEY, JSON.stringify(state));
      }
    } catch {
      return; // No session storage: no frequency cap, so no interstitial.
    }
    if (!overlayAllowedOn(path) || !overlayDue(state, now)) return;
    const due = state;
    // Wait briefly for the page and the ad inventory to settle, then give up for this view.
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const { ads: a, consentPending: pending } = live.current;
      if (!a.ready || pending) {
        if (++tries < 8) timer = window.setTimeout(attempt, 500);
        return;
      }
      if (!a.eligible || !a.ageConfirmed) return;
      const picked = pickAdUnit(a, "interstitial", "overlay", Math.random());
      if (!picked) return;
      try {
        window.sessionStorage.setItem(
          OVERLAY_KEY,
          JSON.stringify({
            ...due,
            shown: due.shown + 1,
            lastShownAt: Date.now(),
            lastShownView: due.views,
          }),
        );
      } catch {
        return;
      }
      setLeft(OVERLAY_SECONDS);
      setUnit(picked);
      recordAdEvent(picked.partnerId, picked.creativeId, "interstitial", "impression");
    };
    timer = window.setTimeout(attempt, 900);
    return () => window.clearTimeout(timer);
  }, [path]);

  // Countdown, Escape to close, focus the close button.
  useEffect(() => {
    if (!unit) return;
    closeRef.current?.focus();
    const tick = window.setInterval(() => setLeft((s) => s - 1), 1000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss(true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("keydown", onKey);
    };
  }, [unit]);

  useEffect(() => {
    if (unit && left <= 0) setUnit(null);
  }, [left, unit]);

  // Leaving the page closes it too.
  useEffect(() => {
    setUnit(null);
  }, [path]);

  function dismiss(manual: boolean) {
    if (unit && manual) recordAdEvent(unit.partnerId, unit.creativeId, "interstitial", "dismiss");
    setUnit(null);
  }

  if (!unit || ads.adFree) return null;

  const cta = unit.ctaLabel ?? t("ads.defaultCta", { name: unit.partnerName });
  const body = unit.body ?? t("ads.defaultBody", { name: unit.partnerName });
  const terms = unit.termsLine ?? t("ads.defaultTerms");

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="presentation">
      <button
        type="button"
        aria-label={t("ads.close")}
        tabIndex={-1}
        onClick={() => dismiss(true)}
        className="absolute inset-0 bg-ink/60 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("ads.overlayAria", { name: unit.partnerName })}
        className="relative w-full max-w-md border border-border bg-background shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <SponsoredLabel kind="advertisement" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-muted-foreground tnum" aria-live="off">
              {t("ads.closesIn", { count: Math.max(0, left) })}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => dismiss(true)}
              aria-label={t("ads.close")}
              className="grid size-8 place-items-center border border-border text-foreground hover:border-primary hover:text-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span
          className="block h-0.5 origin-left bg-primary transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${Math.max(0, left) / OVERLAY_SECONDS})` }}
          aria-hidden="true"
        />
        <div className="p-6 text-center">
          <Logo unit={unit} className="mx-auto h-16 w-28" />
          <p className="mt-4 font-display text-2xl font-extrabold leading-tight">{unit.headline}</p>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          <a
            href={unit.href}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => {
              onAdClick(unit, "interstitial");
              setUnit(null);
            }}
            className="group mt-5 inline-flex w-full items-center justify-center gap-1.5 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            {cta}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="mt-2 w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("ads.continue")}
          </button>
          <p className="mt-2 text-[10px] font-semibold text-muted-foreground">{terms}</p>
          <RgNotice variant="compact" className="mt-1 text-[10px]" />
        </div>
        <div className="flex items-center justify-center border-t border-border px-4 py-2.5">
          <AdFreeLink />
        </div>
      </div>
    </div>
  );
}
