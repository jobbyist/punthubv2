import { describe, expect, it } from "vitest";

import { outboxEmail } from "./outbox";

describe("outbox email", () => {
  it("escapes admin text and keeps paragraphs", () => {
    const { html, text } = outboxEmail("Account update", "Hello <b>there</b>\n\nSecond paragraph");
    expect(html).not.toContain("<b>there</b>");
    expect(html).toContain("&lt;b&gt;there&lt;/b&gt;");
    expect(text).toContain("Second paragraph");
  });
});
