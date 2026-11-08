/**
 * Campaign source (UTM) for this browser tab.
 *
 * The UTM tags on an ad link (utm_source, utm_campaign, ...) are not personal information. They are kept in
 * sessionStorage so a later event in the same visit (join started, profile created) can be credited to the
 * ad that brought the visitor. Nothing is sent anywhere unless the visitor accepts Analytics (see analytics.ts).
 */

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

const STORE_KEY = "puntr:utm";
const SAFE = /^[a-z0-9_.-]{1,64}$/;

/** Reads UTM tags from a query string. Only short, plain values are kept; anything else is ignored. */
export function parseUtm(search: string): Utm {
  const params = new URLSearchParams(search);
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k)?.trim().toLowerCase();
    if (v && SAFE.test(v)) out[k] = v;
  }
  return out;
}

/** Call on every page load: a link with UTM tags replaces what this tab remembered (last ad clicked wins). */
export function captureUtm(
  search: string = typeof location !== "undefined" ? location.search : "",
) {
  const utm = parseUtm(search);
  if (!utm.utm_source && !utm.utm_campaign) return;
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(utm));
  } catch {
    /* storage can be blocked; attribution is best effort */
  }
}

export function currentUtm(): Utm {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: Utm = {};
    for (const k of UTM_KEYS) {
      const v = data[k];
      if (typeof v === "string" && SAFE.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
