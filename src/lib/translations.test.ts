import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { flattenStrings, sameTokens, tokensOf } from "./translations";

const LOCALES = join(import.meta.dirname, "..", "locales");
const load = (code: string, ns: string) =>
  flattenStrings(JSON.parse(readFileSync(join(LOCALES, code, `${ns}.json`), "utf8")));

describe("translation helpers", () => {
  it("flattens nested objects and arrays to dotted keys", () => {
    expect(flattenStrings({ a: { b: "x" }, c: ["y", "z"] })).toEqual({
      "a.b": "x",
      "c.0": "y",
      "c.1": "z",
    });
  });
  it("compares placeholders and numbered tags, not wording", () => {
    expect(tokensOf("Hi {{name}}, read <1>this</1>")).toEqual(["</1>", "<1>", "{{name}}"]);
    expect(sameTokens("Hi {{name}} <1>x</1>", "Hallo <1>y</1> {{name}}")).toBe(true);
    expect(sameTokens("{{count}} picks", "keuses")).toBe(false);
  });
});

describe("Afrikaans bundle", () => {
  // Admin stays English (internal tool); every other section must be complete.
  const namespaces = readdirSync(join(LOCALES, "en-ZA"))
    .filter((f) => f.endsWith(".json") && f !== "admin.json")
    .map((f) => f.replace(/\.json$/, ""));

  it.each(namespaces)("%s has every English key with the same placeholders", (ns) => {
    const en = load("en-ZA", ns);
    const af = load("af", ns);
    const missing = Object.keys(en).filter((k) => !(k in af));
    const extra = Object.keys(af).filter((k) => !(k in en));
    const broken = Object.keys(en).filter((k) => k in af && !sameTokens(en[k]!, af[k]!));
    expect({ missing, extra, broken }).toEqual({ missing: [], extra: [], broken: [] });
  });

  it("keeps the helpline number in the responsible-gambling copy", () => {
    expect(JSON.stringify(load("af", "feedback"))).toContain("0800 006 008");
  });
});
