import { describe, expect, it } from "vitest";

import {
  PRACTICE_CAMPAIGN,
  PRACTICE_ENV_GATE,
  renderPracticeEmail,
  SEQUENCE,
} from "./founding-sequence";

const input = { name: "Thandi Nkosi", unsubscribeUrl: "https://puntr.co.za/unsubscribe?t=x" };

describe("founding practice + feedback email", () => {
  const m = renderPracticeEmail(input);

  it("invites Practice Mode and links to /feedback", () => {
    expect(m.html).toContain("Hi Thandi,");
    expect(m.html).toContain("/practice?");
    expect(m.text).toContain("/feedback?");
    expect(m.text).toContain("utm_campaign=founding-practice-1");
  });

  it("describes the draw accurately: optional, one entry, 18+, T&Cs, rules to follow, not cash", () => {
    expect(m.text).toContain("R500 OTT voucher");
    expect(m.text).toContain("optional");
    expect(m.text).toContain("One entry per member");
    expect(m.text).toContain("18+");
    expect(m.text).toContain("T&Cs apply");
    expect(m.text).toContain("will be published on the feedback page");
    expect(m.text.toLowerCase()).not.toContain("cash prize");
  });

  it("says practice points never become real PuntPoints and demo rewards have no value", () => {
    expect(m.text).toContain("cannot be turned into real PuntPoints");
    expect(m.text).toContain("carry no real value");
  });

  it("is a marketing email with unsubscribe, 18+ and the helpline", () => {
    expect(m.html).toContain("Unsubscribe");
    expect(m.text).toContain("0800 006 008");
  });

  it("never implies profit or a guarantee", () => {
    expect(m.text).not.toMatch(/earn more|win money|guaranteed|\bsure\b|value bet|#1/i);
  });

  it("is a member-only campaign that waits for Practice Mode to be live", () => {
    const entry = SEQUENCE[PRACTICE_CAMPAIGN];
    expect(entry?.memberOnly).toBe(true);
    expect(entry?.requiresEnv).toBe(PRACTICE_ENV_GATE);
    expect(PRACTICE_ENV_GATE).toBe("PRACTICE_MODE_ENABLED");
  });
});
