import { describe, expect, it } from "vitest";

import { memoizeQuotaClaim } from "./quota.server";

describe("memoizeQuotaClaim", () => {
  it("checks a denied provider only once per job but keeps other providers independent", async () => {
    const checked: string[] = [];
    const claim = memoizeQuotaClaim(async (provider) => {
      checked.push(provider);
      return provider === "parallel-chat:low";
    });

    expect(await claim("firecrawl")).toBe(false);
    expect(await claim("firecrawl")).toBe(false);
    expect(await claim("parallel-chat:low")).toBe(true);
    expect(await claim("parallel-chat:low")).toBe(true);
    expect(checked).toEqual(["firecrawl", "parallel-chat:low"]);
  });
});
