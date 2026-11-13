import { describe, expect, it } from "vitest";

import { coverSvg, formatCoverDate, wrap } from "./newsroom-cover";

const assets = {
  logo: "data:image/png;base64,AA",
  montserrat800: "data:font/woff2;base64,AA",
  inter400: "data:font/woff2;base64,AA",
};

describe("newsroom cover", () => {
  it("wraps titles without overflowing and marks cut text", () => {
    expect(wrap("Sundowns go top of the Betway Premiership after beating Pirates", 20, 3)).toEqual([
      "Sundowns go top of",
      "the Betway",
      "Premiership after…",
    ]);
    expect(wrap("Short title", 20, 3)).toEqual(["Short title"]);
  });
  it("escapes text and carries the 18+ line", () => {
    const svg = coverSvg(
      { title: 'A <b> & "c"', category: "sports", excerpt: "x", date: "2026-11-14T04:00:00Z" },
      assets,
    );
    expect(svg).not.toContain("<b>");
    expect(svg).toContain("A &lt;b&gt; &amp; &quot;c&quot;");
    expect(svg).toContain("SPORTS INTELLIGENCE");
    expect(svg).toContain("0800 006 008");
    expect(formatCoverDate("2026-11-14T04:00:00Z")).toBe("14 Nov 2026");
  });
});
