import { describe, expect, it } from "vitest";

import {
  PRACTICE_CAMPAIGN,
  PRACTICE_GATE,
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

  it("states the approved draw terms: both steps, founding only, 18+, one entry, closes at launch, random winner", () => {
    expect(m.text).toContain("R500 OTT voucher");
    expect(m.text).toContain("try Practice Mode at least once");
    expect(m.text).toContain("Both steps are needed");
    expect(m.text).toContain("Founding Members only");
    expect(m.text).toContain("18+");
    expect(m.text).toContain("One entry per member");
    expect(m.text).toContain("T&Cs apply");
    expect(m.text).toContain("closes when Puntr goes live on Tuesday 1 December 2026");
    expect(m.text).toContain("picked at random");
    expect(m.text).toContain("by username and Founding number");
    expect(m.text).toContain("email or phone");
    expect(m.text).toContain("no cash alternative");
    expect(m.text).toContain("full draw rules are on the feedback page");
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
    expect(entry?.requires).toBe(PRACTICE_GATE);
  });
});
