import { describe, expect, it } from "vitest";

import { mapProviderUsage, modelQuotaOptions } from "./usage";

describe("PFIE model quota accounting", () => {
  it("counts refused requests as attempts so exhausted models are not retried", () => {
    const usage = mapProviderUsage(
      [{ provider: "parallel-chat:medium", calls: 9, refused: 342 }],
      [{ provider: "parallel-chat:medium", daily_cap: 18 }],
    );

    expect(usage["parallel-chat:medium"]).toBe(351);
    expect(usage["cap:parallel-chat:medium"]).toBe(18);
  });

  it("passes provider usage and daily caps to the model router", () => {
    const quota = modelQuotaOptions(["parallel-medium", "parallel-low"], {
      "parallel-chat:medium": 351,
      "cap:parallel-chat:medium": 18,
      "parallel-chat:low": 246,
      "cap:parallel-chat:low": 500,
    });

    expect(quota).toEqual({
      usedToday: { "parallel-medium": 351, "parallel-low": 246 },
      dailyCap: { "parallel-medium": 18, "parallel-low": 500 },
    });
  });
});
