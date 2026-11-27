import { describe, expect, it } from "vitest";

import { usernameIdeas } from "./username-ideas";

describe("usernameIdeas", () => {
  it("builds valid handles from the email's local part", () => {
    expect(usernameIdeas("Thabo.M@example.com", 2026)).toEqual([
      "thabo_m",
      "thabo_m_za",
      "thabo_m26",
      "thabo_m_tips",
    ]);
  });
  it("pads very short names and trims long ones", () => {
    expect(usernameIdeas("jo@x.co", 2026)[0]).toBe("punterjo");
    const long = usernameIdeas("averyveryverylongname@x.co", 2026);
    expect(long.every((v) => /^[a-z0-9_]{3,20}$/.test(v))).toBe(true);
  });
  it("copes with an empty email", () => {
    expect(usernameIdeas("", 2026)[0]).toBe("punter");
  });
});
