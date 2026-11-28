import { describe, expect, it } from "vitest";

import { mapProviderUsage, modelQuotaOptions } from "./usage";

describe("Newsroom quota mapping", () => {
  it("counts refused requests and applies database daily caps per model", () => {
    const usage = mapProviderUsage(
      [
        { provider: "parallel-chat:medium", calls: 9, refused: 342 },
        { provider: "parallel-chat:low", calls: 246, refused: 0 },
      ],
      [
        { provider: "parallel-chat:medium", daily_cap: 18 },
        { provider: "parallel-chat:low", daily_cap: 500 },
      ],
    );

    expect(usage["parallel-chat:medium"]).toBe(351);
    expect(
      modelQuotaOptions(["parallel-medium", "parallel-low"], usage),
    ).toEqual({
      usedToday: { "parallel-medium": 351, "parallel-low": 246 },
      dailyCap: { "parallel-medium": 18, "parallel-low": 500 },
    });
  });

  it("uses configured caps for non-Parallel fallback models", () => {
    const usage = mapProviderUsage(
      [{ provider: "gemini:gemini-3.8-flash", calls: 4, refused: 2 }],
      [],
    );
    expect(
      modelQuotaOptions(["gemini-3.8-flash"], usage, { "gemini-3.8-flash": 20 }),
    ).toEqual({
      usedToday: { "gemini-3.8-flash": 6 },
      dailyCap: { "gemini-3.8-flash": 20 },
    });
  });
});
