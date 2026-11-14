import { describe, expect, it } from "vitest";

import {
  TASK_IDS,
  WORKSTREAMS,
  computeReadiness,
  daysToLaunch,
  readinessVerdict,
  type Workstream,
} from "./mvp-readiness";

const tiny: Workstream[] = [
  {
    id: "a",
    title: "A",
    weight: 60,
    tasks: [
      { id: "a1", title: "a1", weight: 1, done: true },
      { id: "a2", title: "a2", weight: 1, blocker: true },
    ],
  },
  {
    id: "b",
    title: "B",
    weight: 40,
    tasks: [
      {
        id: "b1",
        title: "b1",
        weight: 1,
        metric: { key: "foundingMembers", target: 100, unit: "m" },
      },
    ],
  },
];

describe("mvp readiness", () => {
  it("workstream weights add up to 100 and task ids are unique", () => {
    expect(WORKSTREAMS.reduce((s, w) => s + w.weight, 0)).toBe(100);
    const ids = WORKSTREAMS.flatMap((w) => w.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scores defaults, stored ticks and metrics", () => {
    // a: half done = 30; b: 40/100 members = 16
    expect(computeReadiness({}, { foundingMembers: 40 }, tiny).score).toBe(46);
    const r = computeReadiness({ a2: { done: true } }, { foundingMembers: 250 }, tiny);
    expect(r.score).toBe(100);
    expect(r.openBlockers).toHaveLength(0);
  });

  it("a stored row can untick a default-done task", () => {
    const r = computeReadiness({ a1: { done: false } }, {}, tiny);
    expect(r.score).toBe(0);
    expect(r.openBlockers.map((t) => t.id)).toEqual(["a2"]);
  });

  it("missing or bad metrics count as zero", () => {
    expect(computeReadiness({}, { foundingMembers: null }, tiny).score).toBe(30);
    expect(computeReadiness({}, { foundingMembers: Number.NaN }, tiny).score).toBe(30);
  });

  it("metric tasks cannot be ticked by hand", () => {
    expect(TASK_IDS.has("founding-100")).toBe(false);
    expect(TASK_IDS.has("payg-checkout")).toBe(true);
  });

  it("verdict and countdown", () => {
    expect(readinessVerdict(95, 0)).toBe("Launch ready");
    expect(readinessVerdict(95, 1)).toBe("On track, blockers open");
    expect(readinessVerdict(40, 3)).toBe("Not ready");
    expect(daysToLaunch(Date.parse("2026-11-14T17:00:00+02:00"))).toBe(17);
    expect(daysToLaunch(Date.parse("2026-12-02T00:00:00+02:00"))).toBe(0);
  });
});
