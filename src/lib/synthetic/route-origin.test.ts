import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_QA_ORIGIN,
  syntheticQaUrl,
  syntheticResearchUrl,
} from "@/lib/synthetic/route-origin";

describe("Synthetic QA canonical origin", () => {
  it("targets the canonical Puntr domain rather than the Vercel cron hostname", () => {
    expect(syntheticQaUrl("/").toString()).toBe("https://puntr.co.za/");
    expect(syntheticQaUrl("/fixtures").origin).toBe(SYNTHETIC_QA_ORIGIN);
  });

  it("keeps the follow-up research request on the canonical Puntr domain", () => {
    expect(syntheticResearchUrl().toString()).toBe(
      "https://puntr.co.za/api/cron/synthetic-decisions-daily",
    );
  });

  it("rejects paths that could escape the canonical origin", () => {
    expect(() => syntheticQaUrl("//example.com/path")).toThrow(
      "Synthetic QA paths must be absolute same-origin paths",
    );
    expect(() => syntheticQaUrl("https://example.com/path")).toThrow(
      "Synthetic QA paths must be absolute same-origin paths",
    );
  });
});
