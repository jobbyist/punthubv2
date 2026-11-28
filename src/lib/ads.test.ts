import { describe, expect, it } from "vitest";

import {
  EMPTY_OVERLAY_STATE,
  OVERLAY_MAX_PER_SESSION,
  OVERLAY_MIN_GAP_MS,
  overlayAllowedOn,
  overlayDue,
  parseOverlayState,
  pickAdUnit,
  slotRoll,
  withAdBreaks,
  type AdCreative,
  type AdPartner,
} from "./ads";

const hwb: AdPartner = {
  id: "p1",
  name: "Hollywoodbets",
  slug: "hollywoodbets",
  tracking_link: "https://aff.example/hwb",
  website_url: null,
};
const xbet: AdPartner = {
  id: "p2",
  name: "1xBet",
  slug: "1xbet",
  tracking_link: "https://aff.example/1x",
  website_url: null,
};
const creative = (over: Partial<AdCreative>): AdCreative => ({
  id: "c1",
  partner_id: "p1",
  partner_name: "Hollywoodbets",
  partner_slug: "hollywoodbets",
  format: "card",
  headline: "Approved headline",
  body: null,
  cta_label: "Join",
  image_url: null,
  tracking_link: "https://aff.example/hwb-promo",
  terms_line: "18+ T&Cs apply",
  placements: [],
  weight: 1,
  ...over,
});

describe("pickAdUnit", () => {
  it("returns nothing without live partners", () => {
    expect(
      pickAdUnit({ partners: [], creatives: [creative({})] }, "newsroom", "card", 0),
    ).toBeNull();
  });
  it("prefers an approved creative for the format and placement", () => {
    const unit = pickAdUnit(
      { partners: [hwb, xbet], creatives: [creative({})] },
      "newsroom",
      "card",
      0.5,
    );
    expect(unit?.creativeId).toBe("c1");
    expect(unit?.href).toBe("https://aff.example/hwb-promo");
  });
  it("skips creatives for another placement or format, and falls back to a neutral default", () => {
    const creatives = [
      creative({ placements: ["teams"] }),
      creative({ id: "c2", format: "banner" }),
    ];
    const unit = pickAdUnit({ partners: [hwb, xbet], creatives }, "newsroom", "card", 0.9);
    expect(unit?.creativeId).toBeNull();
    expect(unit?.partnerName).toBe("1xBet");
    expect(unit?.ctaLabel).toBeNull();
  });
  it("ignores creatives whose partner is no longer live", () => {
    const unit = pickAdUnit({ partners: [xbet], creatives: [creative({})] }, "newsroom", "card", 0);
    expect(unit?.partnerId).toBe("p2");
    expect(unit?.creativeId).toBeNull();
  });
});

describe("interstitial frequency cap", () => {
  it("waits for the third page view, then at least four more views", () => {
    const first = (views: number) => overlayDue({ ...EMPTY_OVERLAY_STATE, views }, 0);
    expect([1, 2, 3, 4].map(first)).toEqual([false, false, true, true]);
    const after = (views: number) =>
      overlayDue({ views, shown: 1, lastShownAt: 1, lastShownView: 3 }, 1 + OVERLAY_MIN_GAP_MS);
    expect([4, 6, 7, 9].map(after)).toEqual([false, false, true, true]);
  });
  it("respects the minimum gap and the per-session maximum", () => {
    const now = 10_000_000;
    const base = { views: 7, shown: 1, lastShownView: 3 };
    expect(overlayDue({ ...base, lastShownAt: now - 1000 }, now)).toBe(false);
    expect(overlayDue({ ...base, lastShownAt: now - OVERLAY_MIN_GAP_MS }, now)).toBe(true);
    expect(overlayDue({ ...base, shown: OVERLAY_MAX_PER_SESSION, lastShownAt: 0 }, now)).toBe(
      false,
    );
  });
  it("never shows on sign-up, payment, legal or help pages", () => {
    for (const p of [
      "/join",
      "/pricing",
      "/wallet",
      "/admin",
      "/responsible-play",
      "/terms",
      "/auth/callback",
    ]) {
      expect(overlayAllowedOn(p)).toBe(false);
    }
    expect(overlayAllowedOn("/newsroom")).toBe(true);
    expect(overlayAllowedOn("/teams")).toBe(true);
  });
  it("parses stored state defensively", () => {
    expect(parseOverlayState("not json")).toEqual(EMPTY_OVERLAY_STATE);
    expect(parseOverlayState('{"views":-1,"shown":2}')).toEqual({
      views: 0,
      shown: 2,
      lastShownAt: 0,
      lastShownView: 0,
    });
  });
});

describe("helpers", () => {
  it("gives a stable roll per seed", () => {
    expect(slotRoll("newsroom-1")).toBe(slotRoll("newsroom-1"));
    expect(slotRoll("a")).toBeGreaterThanOrEqual(0);
    expect(slotRoll("a")).toBeLessThan(1);
  });
  it("inserts ad breaks between items, never at the end", () => {
    const out = withAdBreaks([1, 2, 3, 4], 2).map((x) => (x.kind === "ad" ? "ad" : x.item));
    expect(out).toEqual([1, 2, "ad", 3, 4]);
  });
});
