import { describe, expect, it } from "vitest";

import {
  needsPuntAiLiveWeb,
  normalizePuntAiQuestion,
  scrubPuntAiMessage,
} from "./punt-ai.logic";

describe("PUNT AI request safety", () => {
  it("normalizes cache keys without changing the user's meaning", () => {
    expect(normalizePuntAiQuestion("  Premier   League TABLE? ")).toBe("premier league table?");
  });

  it("routes time-sensitive questions to the live-web path", () => {
    expect(needsPuntAiLiveWeb("Any latest injury news for Sundowns?")).toBe(true);
    expect(needsPuntAiLiveWeb("What is ROI?")).toBe(false);
  });

  it("redacts personal contact details and links before external calls", () => {
    expect(scrubPuntAiMessage("Email me at test@example.com or call 082 123 4567 @michael https://example.com"))
      .toBe("Email me at [redacted email] or call [redacted phone] [redacted handle] [link omitted]");
  });
});
