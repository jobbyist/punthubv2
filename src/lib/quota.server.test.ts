import { describe, expect, it, vi } from "vitest";

import { memoizeQuotaClaim } from "./quota.server";

describe("memoizeQuotaClaim", () => {
  it("checks a denied provider only once per job but keeps other providers independent", async () => {
    const checked: string[] = [];
    const claim = memoizeQuotaClaim(async (provider) => ({
      granted: provider === "parallel-chat:low",
      attemptId: `attempt-${provider}`,
      ...(provider === "firecrawl" ? { reasonCode: "provider_daily_call_cap_exhausted" } : {}),
    }));

    expect(await claim("firecrawl")).toEqual({
      granted: false,
      attemptId: "attempt-firecrawl",
      reasonCode: "provider_daily_call_cap_exhausted",
    });
    expect(await claim("firecrawl")).toEqual({
      granted: false,
      attemptId: "attempt-firecrawl",
      reasonCode: "provider_daily_call_cap_exhausted",
    });
    expect(await claim("parallel-chat:low")).toEqual({
      granted: true,
      attemptId: "attempt-parallel-chat:low",
    });
    expect(await claim("parallel-chat:low")).toEqual({
      granted: true,
      attemptId: "attempt-parallel-chat:low",
    });
    expect(checked).toEqual([]);
  });

  it("exposes result finalisation without repeating a denied claim", async () => {
    const finalise = vi.fn(async () => undefined);
    const claim = memoizeQuotaClaim(
      async () => ({ granted: false, attemptId: "attempt-1", reasonCode: "global_parallel_period_budget_exhausted" }),
      finalise,
    );
    const denied = await claim("parallel-chat:low");
    expect(denied.granted).toBe(false);
    await claim("parallel-chat:low");
    await claim.recordResult("attempt-1", "failed", "upstream_quota");
    expect(finalise).toHaveBeenCalledTimes(1);
    expect(finalise).toHaveBeenCalledWith("attempt-1", "failed", "upstream_quota");
  });
});
