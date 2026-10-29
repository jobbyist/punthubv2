import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, locales, matchLocale, resolveLocale } from "./config";
import { pseudoString } from "@/lib/i18n/pseudo";

describe("resolveLocale", () => {
  it("defaults to en-ZA", () => {
    expect(resolveLocale({})).toBe(DEFAULT_LOCALE);
  });
  it("ignores languages that are not enabled", () => {
    expect(locales.filter((l) => l.enabled).map((l) => l.code)).toEqual(["en-ZA"]);
    expect(resolveLocale({ cookie: "af", acceptLanguage: "zu,xh;q=0.8" })).toBe("en-ZA");
  });
  it("matches regional tags onto the enabled locale", () => {
    expect(matchLocale("en-GB")).toBe("en-ZA");
    expect(matchLocale("en")).toBe("en-ZA");
    expect(matchLocale("fr-FR")).toBeNull();
  });
  it("prefers profile, then cookie, then Accept-Language", () => {
    expect(resolveLocale({ profile: "en-ZA", cookie: "fr", acceptLanguage: "fr" })).toBe("en-ZA");
    expect(resolveLocale({ cookie: "en-ZA", acceptLanguage: "fr" })).toBe("en-ZA");
  });
});

describe("pseudoString", () => {
  it("accents, pads and brackets", () => {
    const out = pseudoString("Predict smarter");
    expect(out.startsWith("[")).toBe(true);
    expect(out.endsWith("]")).toBe(true);
    expect(out).not.toContain("Predict");
    expect(out.length).toBeGreaterThan("Predict smarter".length * 1.3);
  });
  it("keeps interpolation and tags intact", () => {
    const out = pseudoString("Hi {{name}}, read <1>this</1>");
    expect(out).toContain("{{name}}");
    expect(out).toContain("<1>");
    expect(out).toContain("</1>");
  });
});
