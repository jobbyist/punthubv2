import { describe, expect, it } from "vitest";

import { buildRoadmap, weekWindow } from "@/lib/roadmap";

const launch = "2026-11-02";
const stage = (items: ReturnType<typeof buildRoadmap>, sport: string) =>
  items.find((i) => i.sport === sport)?.stage;

describe("roadmap", () => {
  it("counts weeks from launch week", () => {
    expect(weekWindow(launch, [1, 1])).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(weekWindow(launch, [2, 2])).toEqual({ from: "2026-11-09", to: "2026-11-15" });
    expect(weekWindow(launch, [6, 8])).toEqual({ from: "2026-12-07", to: "2026-12-27" });
    expect(weekWindow(launch, [12, 12])).toEqual({ from: "2027-01-18", to: "2027-01-24" });
  });

  it("shows soccer as launching before launch day, and basketball and rugby as next", () => {
    const items = buildRoadmap({ today: "2026-10-30", launch, enabled: ["soccer"] });
    expect(stage(items, "soccer")).toBe("launching");
    expect(stage(items, "basketball")).toBe("next");
    expect(stage(items, "rugby")).toBe("next");
    expect(stage(items, "racing")).toBe("planned");
  });

  it("only shows a sport as live when it is switched on", () => {
    const items = buildRoadmap({ today: "2026-11-10", launch, enabled: ["soccer"] });
    expect(stage(items, "soccer")).toBe("live");
    // Week 2 has started, but rugby is not switched on: not live.
    expect(stage(items, "rugby")).toBe("inProgress");
    expect(stage(items, "racing")).toBe("next");

    const on = buildRoadmap({ today: "2026-11-10", launch, enabled: ["soccer", "rugby"] });
    expect(stage(on, "rugby")).toBe("live");
  });

  it("never shows anything as live before launch", () => {
    const items = buildRoadmap({ today: "2026-10-30", launch, enabled: ["soccer", "rugby"] });
    expect(items.some((i) => i.stage === "live")).toBe(false);
  });
});
