import { describe, expect, it } from "vitest";

import {
  ANNUAL_PASS_OFFER_END,
  isOfferOpen,
  renderAnnualPassExpiredEmail,
} from "./annual-pass-expired";

const EXPIRED = "2026-11-11T09:00:00Z"; // 11:00 SAST

describe("annual pass expired email", () => {
  it("offers a fresh reservation while the offer is open", () => {
    const m = renderAnnualPassExpiredEmail({
      name: "Thandi Nkosi",
      holdExpiredAt: EXPIRED,
      offerOpen: true,
    });
    expect(m.subject).toContain("you can reserve again");
    expect(m.html).toContain("Hi Thandi,");
    expect(m.html).toContain("Reserve my Annual Pass again");
    expect(m.html).toContain("/founding#annual-pass");
    expect(m.text).toContain("16 November 2026");
    expect(m.text).toContain("No payment was taken");
  });

  it("states the SAST expiry time", () => {
    const m = renderAnnualPassExpiredEmail({ name: "", holdExpiredAt: EXPIRED, offerOpen: true });
    expect(m.text).toContain("11:00");
    expect(m.html).toContain("Hi,");
  });

  it("does not offer a reservation once the offer has closed", () => {
    const m = renderAnnualPassExpiredEmail({
      name: "Thandi",
      holdExpiredAt: EXPIRED,
      offerOpen: false,
    });
    expect(m.html).not.toContain("Reserve my Annual Pass again");
    expect(m.html).not.toContain("/founding#annual-pass");
    expect(m.text).toContain("closed on 16 November 2026");
  });

  it("is a service email: no unsubscribe link, carries 18+ and the helpline", () => {
    for (const offerOpen of [true, false]) {
      const m = renderAnnualPassExpiredEmail({ name: "A", holdExpiredAt: EXPIRED, offerOpen });
      expect(m.html.toLowerCase()).not.toContain("unsubscribe");
      expect(m.text).toContain("0800 006 008");
      expect(m.text).toContain("18+");
    }
  });

  it("never implies profit or guarantees", () => {
    for (const offerOpen of [true, false]) {
      const m = renderAnnualPassExpiredEmail({ name: "A", holdExpiredAt: EXPIRED, offerOpen });
      expect(m.text).not.toMatch(/earn more|win money|guaranteed|\bsure\b|value bet|#1/i);
    }
  });

  it("knows when the offer closes", () => {
    expect(isOfferOpen(new Date("2026-11-16T21:00:00Z"))).toBe(true); // 23:00 SAST
    expect(isOfferOpen(new Date("2026-11-16T22:00:00Z"))).toBe(false); // 00:00 SAST on 17 Nov
    expect(new Date(ANNUAL_PASS_OFFER_END).toISOString()).toBe("2026-11-16T21:59:59.000Z");
  });
});
