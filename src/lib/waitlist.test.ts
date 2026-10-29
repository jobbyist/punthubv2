import { describe, expect, it } from "vitest";

import { renderWaitlistInvite } from "./email/waitlist-invite";
import { planInvites, unsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./waitlist";

describe("planInvites", () => {
  it("dedupes by lower-case email and drops invalid addresses", () => {
    const plan = planInvites({
      waitlist: ["A@Example.com", "a@example.com ", "b@example.com", "not-an-email", ""],
      alreadyInvited: [],
      unsubscribed: [],
      privacyRequests: [],
    });
    expect(plan.recipients).toEqual(["a@example.com", "b@example.com"]);
    expect(plan.skipped).toMatchObject({ duplicate: 1, invalid: 2 });
  });
  it("skips people already emailed, unsubscribed, or with any privacy request", () => {
    const plan = planInvites({
      waitlist: ["done@example.com", "gone@example.com", "asked@example.com", "ok@example.com"],
      alreadyInvited: ["DONE@example.com"],
      unsubscribed: ["gone@example.com"],
      privacyRequests: ["Asked@Example.com"],
    });
    expect(plan.recipients).toEqual(["ok@example.com"]);
    expect(plan.skipped).toMatchObject({ already_invited: 1, unsubscribed: 1, privacy_request: 1 });
  });
  it("is empty for an empty waitlist", () => {
    expect(
      planInvites({ waitlist: [], alreadyInvited: [], unsubscribed: [], privacyRequests: [] })
        .recipients,
    ).toEqual([]);
  });
});

describe("unsubscribe tokens", () => {
  const secret = "test-secret";
  it("verify for the right email, regardless of case", () => {
    const t = unsubscribeToken("Person@Example.com", secret);
    expect(verifyUnsubscribeToken("person@example.com", t, secret)).toBe(true);
  });
  it("fail for another email, another secret, or a malformed token", () => {
    const t = unsubscribeToken("a@example.com", secret);
    expect(verifyUnsubscribeToken("b@example.com", t, secret)).toBe(false);
    expect(verifyUnsubscribeToken("a@example.com", t, "other")).toBe(false);
    expect(verifyUnsubscribeToken("a@example.com", "abc", secret)).toBe(false);
    expect(verifyUnsubscribeToken("a@example.com", t, "")).toBe(false);
  });
  it("builds a link that carries the lower-case email and its token", () => {
    const url = new URL(unsubscribeUrl("A+x@Example.com", secret));
    expect(url.origin + url.pathname).toBe("https://puntr.co.za/unsubscribe");
    expect(url.searchParams.get("e")).toBe("a+x@example.com");
    expect(verifyUnsubscribeToken("a+x@example.com", url.searchParams.get("t")!, secret)).toBe(
      true,
    );
  });
});

describe("renderWaitlistInvite", () => {
  const mail = renderWaitlistInvite({
    spotsLeft: 63,
    cap: 100,
    unsubscribeUrl: "https://puntr.co.za/unsubscribe?e=a&t=b",
  });
  it("has the agreed subject and the required elements", () => {
    expect(mail.subject).toBe("Your Puntr early-access spot is open");
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain("https://puntr.co.za/join");
      expect(body).toContain("63 of 100 Founding spots are left.");
      expect(body).toContain("You are getting this one email because you asked for early access");
      expect(body).toContain("https://puntr.co.za/unsubscribe?e=a");
      expect(body).toContain("https://puntr.co.za/privacy");
      expect(body).toContain("18+");
      expect(body).toContain("0800 006 008");
    }
  });
  it("says when the Founding spots are full, and omits the line if the count is unknown", () => {
    expect(renderWaitlistInvite({ spotsLeft: 0, cap: 100, unsubscribeUrl: "u" }).text).toContain(
      "now full",
    );
    expect(
      renderWaitlistInvite({ spotsLeft: null, cap: 100, unsubscribeUrl: "u" }).text,
    ).not.toMatch(/Founding spots/);
  });
  it("contains no promotion, partner or giveaway wording", () => {
    expect(mail.html + mail.text).not.toMatch(
      /bonus|free bet|giveaway|win |prize|offer|discount|supabets|playbet|mr price|earn/i,
    );
  });
});
