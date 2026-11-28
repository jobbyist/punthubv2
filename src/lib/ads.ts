/**
 * Ads and affiliate units: pure selection and frequency-cap logic (no React, no Supabase), so it is unit tested.
 * Rules (CLAUDE.md Affiliates + owner request 28 Nov 2026):
 * - Only live, licensed partners from the public views; creatives only once the partner approved them.
 * - Every unit is labelled SPONSORED or ADVERTISEMENT and carries 18+ / T&Cs / the helpline.
 * - Puntr Pro members, guests who have not confirmed 18+ and members on a break never see a unit.
 * - Interstitials are frequency capped, dismissible at once and close on their own after a few seconds.
 */

export type AdFormat = "banner" | "card" | "text_link" | "overlay";

export type AdPartner = {
  id: string;
  name: string;
  slug: string | null;
  tracking_link: string;
  website_url: string | null;
};

export type AdCreative = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_slug: string | null;
  format: AdFormat;
  headline: string;
  body: string | null;
  cta_label: string;
  image_url: string | null;
  tracking_link: string;
  terms_line: string | null;
  placements: string[];
  weight: number;
};

/** What a slot renders: a partner-approved creative, or Puntr's neutral default unit for a live partner. */
export type AdUnit = {
  partnerId: string;
  partnerName: string;
  partnerSlug: string | null;
  creativeId: string | null;
  headline: string;
  body: string | null;
  ctaLabel: string | null;
  imageUrl: string | null;
  href: string;
  termsLine: string | null;
};

/** Seconds an interstitial stays up before it closes itself (owner: 5 to 10 seconds). */
export const OVERLAY_SECONDS = 8;
/** First interstitial no earlier than this many page views in a session, then every OVERLAY_EVERY views. */
export const OVERLAY_FIRST_AFTER = 3;
export const OVERLAY_EVERY = 4;
/** At least this long between two interstitials, and never more than OVERLAY_MAX_PER_SESSION per session. */
export const OVERLAY_MIN_GAP_MS = 3 * 60_000;
export const OVERLAY_MAX_PER_SESSION = 3;

/** Routes that never show an interstitial: sign-up, payments, help, legal and admin. */
const OVERLAY_EXCLUDED = [
  /^\/(join|verify|auth|reset-password|unsubscribe|coming-soon|founding)(\/|$)/,
  /^\/(admin|dev|account|wallet|pricing)(\/|$)/,
  /^\/(responsible-play|terms|privacy|cookies|refunds|affiliate-disclosure|support)(\/|$)/,
];

export function overlayAllowedOn(path: string): boolean {
  return !OVERLAY_EXCLUDED.some((re) => re.test(path));
}

export type OverlayState = {
  views: number;
  shown: number;
  lastShownAt: number;
  /** Page-view count when the last interstitial showed. */
  lastShownView: number;
};
export const EMPTY_OVERLAY_STATE: OverlayState = {
  views: 0,
  shown: 0,
  lastShownAt: 0,
  lastShownView: 0,
};

/** Decide on a page view whether an interstitial is due. `state.views` already counts this view. */
export function overlayDue(state: OverlayState, now: number): boolean {
  if (state.shown >= OVERLAY_MAX_PER_SESSION) return false;
  if (state.views < OVERLAY_FIRST_AFTER) return false;
  if (state.shown > 0 && state.views - state.lastShownView < OVERLAY_EVERY) return false;
  return !state.lastShownAt || now - state.lastShownAt >= OVERLAY_MIN_GAP_MS;
}

export function parseOverlayState(raw: string | null): OverlayState {
  if (!raw) return EMPTY_OVERLAY_STATE;
  try {
    const v = JSON.parse(raw) as Partial<OverlayState>;
    const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0);
    return {
      views: n(v.views),
      shown: n(v.shown),
      lastShownAt: n(v.lastShownAt),
      lastShownView: n(v.lastShownView),
    };
  } catch {
    return EMPTY_OVERLAY_STATE;
  }
}

function creativeFits(c: AdCreative, placement: string, format: AdFormat): boolean {
  if (c.format !== format) return false;
  return c.placements.length === 0 || c.placements.includes(placement);
}

/** Weighted pick; `roll` in [0, 1). */
function weighted<T extends { weight: number }>(items: T[], roll: number): T | undefined {
  const total = items.reduce((s, x) => s + Math.max(1, x.weight), 0);
  let at = roll * total;
  for (const x of items) {
    at -= Math.max(1, x.weight);
    if (at < 0) return x;
  }
  return items[items.length - 1];
}

/**
 * Choose the unit for a slot. Approved creatives for the format and placement win; otherwise a live partner
 * gets Puntr's neutral default unit (name, logo, sign-up link; no invented offers). `roll` rotates partners.
 */
export function pickAdUnit(
  { partners, creatives }: { partners: AdPartner[]; creatives: AdCreative[] },
  placement: string,
  format: AdFormat,
  roll: number,
): AdUnit | null {
  const live = new Set(partners.map((p) => p.id));
  const fits = creatives.filter(
    (c) => live.has(c.partner_id) && creativeFits(c, placement, format),
  );
  const c = weighted(fits, roll);
  if (c) {
    return {
      partnerId: c.partner_id,
      partnerName: c.partner_name,
      partnerSlug: c.partner_slug,
      creativeId: c.id,
      headline: c.headline,
      body: c.body,
      ctaLabel: c.cta_label,
      imageUrl: c.image_url,
      href: c.tracking_link,
      termsLine: c.terms_line,
    };
  }
  if (partners.length === 0) return null;
  const p = partners[Math.min(partners.length - 1, Math.floor(roll * partners.length))]!;
  return {
    partnerId: p.id,
    partnerName: p.name,
    partnerSlug: p.slug,
    creativeId: null,
    headline: p.name,
    body: null,
    ctaLabel: null,
    imageUrl: null,
    href: p.tracking_link,
    termsLine: null,
  };
}

/** Stable roll per slot so a unit does not change on every re-render. */
export function slotRoll(seed: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Insert an ad marker after every `every` items (never after the last item). */
export function withAdBreaks<T>(
  items: T[],
  every: number,
): ({ kind: "item"; item: T } | { kind: "ad"; index: number })[] {
  const out: ({ kind: "item"; item: T } | { kind: "ad"; index: number })[] = [];
  let ads = 0;
  items.forEach((item, i) => {
    out.push({ kind: "item", item });
    if (every > 0 && (i + 1) % every === 0 && i < items.length - 1)
      out.push({ kind: "ad", index: ads++ });
  });
  return out;
}
