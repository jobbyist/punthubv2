import { describe, expect, it } from "vitest";

import { PFIE_SOURCES } from "@/lib/pfie/provider";
import { STANDINGS_LAUNCH_KEYS } from "@/lib/pfie/standings";

import { competitions } from "./competitions";
import { competitionsIn, coverageKeyFor, SOCCER_PHASE, soccerCoverage } from "./coverage";

describe("football coverage registry", () => {
  it("gives every football competition a phase", () => {
    for (const c of competitions.filter((x) => x.sport === "soccer"))
      expect(SOCCER_PHASE[c.key], c.key).toBeDefined();
  });

  it("keeps the launch set equal to the launch standings set, in order", () => {
    expect(competitionsIn("launch")).toEqual([...STANDINGS_LAUNCH_KEYS]);
  });

  it("marks a competition as read by PFIE exactly when it has PFIE sources", () => {
    for (const c of soccerCoverage()) expect(c.fixtures, c.key).toBe(Boolean(PFIE_SOURCES[c.key]));
  });

  it("lists phases in order: launch, post-launch, planned", () => {
    const phases = soccerCoverage().map((c) => c.phase);
    const firstPost = phases.indexOf("post-launch");
    const firstPlanned = phases.indexOf("planned");
    expect(phases.slice(0, firstPost).every((p) => p === "launch")).toBe(true);
    const postEnd = firstPlanned === -1 ? phases.length : firstPlanned;
    expect(phases.slice(firstPost, postEnd).every((p) => p === "post-launch")).toBe(true);
    expect(phases.slice(postEnd).every((p) => p === "planned")).toBe(true);
  });

  it("maps stored competition names back to keys", () => {
    expect(coverageKeyFor("Betway Premiership")).toBe("psl");
    expect(coverageKeyFor("United Rugby Championship")).toBeNull();
    expect(coverageKeyFor("Unknown Cup")).toBeNull();
  });
});
