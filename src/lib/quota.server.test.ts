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

  it("passes competition and job-run context into the atomic quota claim", async () => {
    const seen: { provider: string; context: unknown }[] = [];
    const context = {
      competition: "championship",
      jobRunId: "9b7d2d9c-77fd-4e29-84a2-8f2011d00000",
      jobKind: "standings",
      requestId: "a44a3db4-b7d4-4e6b-81a8-6d77c0a50000",
    };
    const claim = memoizeQuotaClaim(async (provider, received) => {
      seen.push({ provider, context: received });
      return true;
    });

    expect(await claim("parallel", context)).toBe(true);
    expect(seen).toEqual([{ provider: "parallel", context }]);
  });
});
