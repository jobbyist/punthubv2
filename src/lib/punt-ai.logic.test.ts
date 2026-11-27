import { describe, expect, it } from "vitest";

import {
  containsPuntAiPrivateContext,
  isPuntAiOddsQuestion,
  needsPuntAiLiveWeb,
  normalizePuntAiQuestion,
  scrubPuntAiMessage,
} from "./punt-ai.logic";

describe("PUNT AI request safety", () => {
  it("normalizes cache keys without changing the user's meaning", () => {
    expect(normalizePuntAiQuestion("  Premier   League TABLE? ")).toBe("premier league table?");
  });

  it("routes time-sensitive questions to live web but not bookmaker odds", () => {
    expect(needsPuntAiLiveWeb("Any latest injury news for Sundowns?")).toBe(true);
    expect(needsPuntAiLiveWeb("What is ROI?")).toBe(false);
    expect(needsPuntAiLiveWeb("What are the current bookmaker odds?")).toBe(false);
    expect(isPuntAiOddsQuestion("What are the current bookmaker odds?")).toBe(true);
  });

  it("keeps private account questions out of live web", () => {
    expect(containsPuntAiPrivateContext("What is my account balance?")).toBe(true);
  });

  it("redacts personal contact details and links before external calls", () => {
    expect(scrubPuntAiMessage("Email me at test@example.com or call 082 123 4567 @michael https://example.com"))
      .toBe("Email me at [redacted email] or call [redacted phone] [redacted handle] [link omitted]");
  });
});
