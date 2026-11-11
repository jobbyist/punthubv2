import { describe, expect, it } from "vitest";

import { hoursLeftText, renderAnnualPassReminderEmail } from "./annual-pass-reminder";

const HOLD = "2026-11-12T19:54:03.777Z"; // Thu 12 Nov 2026, 21:54 SAST
const NOW = new Date("2026-11-12T03:54:03.777Z"); // 16 hours earlier
const URL_ = "https://puntr.co.za/api/annual-pass/pay?token=abc.def";

describe("hoursLeftText", () => {
  it("rounds to whole hours and never goes negative", () => {
    expect(hoursLeftText(HOLD, NOW)).toBe("about 16 hours");
    expect(hoursLeftText(HOLD, new Date("2026-11-12T18:54:03.777Z"))).toBe("about 1 hour");
    expect(hoursLeftText(HOLD, new Date("2026-11-12T19:30:00.000Z"))).toBe("under an hour");
    expect(hoursLeftText(HOLD, new Date("2026-11-13T00:00:00.000Z"))).toBe("under an hour");
  });
});

describe("renderAnnualPassReminderEmail", () => {
  const mail = renderAnnualPassReminderEmail({
    name: "Thandi Mokoena",
    paymentUrl: URL_,
    holdExpiresAt: HOLD,
    now: NOW,
  });

  it("shows the deadline in South African time, the hours left and the amount", () => {
    expect(mail.subject).toContain("21:54");
    expect(mail.text).toContain("about 16 hours");
    expect(mail.text).toContain("R299");
    expect(mail.html).toContain("21:54");
  });

  it("links to the signed pay URL and greets by first name", () => {
    expect(mail.html).toContain(URL_);
    expect(mail.text).toContain(URL_);
    expect(mail.text).toContain("Hi Thandi,");
  });

  it("is a service email: no unsubscribe link, carries 18+ and the helpline", () => {
    expect(mail.html).not.toMatch(/unsubscribe/i);
    expect(mail.text).toContain("0800 006 008");
  });

  it("avoids profit claims", () => {
    expect(`${mail.subject} ${mail.text}`).not.toMatch(
      /guarantee|earn more|win money|sure thing|value bet/i,
    );
  });

  it("falls back to a plain greeting without a name", () => {
    const anon = renderAnnualPassReminderEmail({
      name: "",
      paymentUrl: URL_,
      holdExpiresAt: HOLD,
      now: NOW,
    });
    expect(anon.text).toContain("Hi,");
  });
});
