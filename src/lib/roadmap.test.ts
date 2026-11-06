import { describe, expect, it } from "vitest";

import { buildRoadmap, weekWindow } from "@/lib/roadmap";

const launch = "2026-12-01";
const stage = (items: ReturnType<typeof buildRoadmap>, sport: string) =>
  items.find((i) => i.sport === sport)?.stage;

describe("roadmap", () => {
  it("counts weeks from launch week", () => {
    expect(weekWindow(launch, [1, 1])).toEqual({ from: "2026-12-01", to: "2026-12-07" });
    expect(weekWindow(launch, [2, 2])).toEqual({ from: "2026-12-08", to: "2026-12-14" });
    expect(weekWindow(launch, [6, 8])).toEqual({ from: "2027-01-05", to: "2027-01-25" });
    expect(weekWindow(launch, [12, 12])).toEqual({ from: "2027-02-16", to: "2027-02-22" });
  });

  it("shows soccer as launching before launch day, and basketball and rugby as next", () => {
    const items = buildRoadmap({ today: "2026-11-05", launch, enabled: ["soccer"] });
    expect(stage(items, "soccer")).toBe("launching");
    expect(stage(items, "basketball")).toBe("next");
    expect(stage(items, "rugby")).toBe("next");
    expect(stage(items, "racing")).toBe("planned");
  });

  it("plans athletics alongside combat sports in weeks 6 to 8", () => {
    const items = buildRoadmap({ today: "2026-11-05", launch, enabled: ["soccer"] });
    const a = items.find((i) => i.sport === "athletics");
    const c = items.find((i) => i.sport === "combat");
    expect(a?.weeks).toEqual([6, 8]);
    expect([a?.from, a?.to]).toEqual([c?.from, c?.to]);
  });

  it("only shows a sport as live when it is switched on", () => {
    const items = buildRoadmap({ today: "2026-12-10", launch, enabled: ["soccer"] });
    expect(stage(items, "soccer")).toBe("live");
    // Week 2 has started, but rugby is not switched on: not live.
    expect(stage(items, "rugby")).toBe("inProgress");
    expect(stage(items, "racing")).toBe("next");

    const on = buildRoadmap({ today: "2026-12-10", launch, enabled: ["soccer", "rugby"] });
    expect(stage(on, "rugby")).toBe("live");
  });

  it("never shows anything as live before launch", () => {
    const items = buildRoadmap({ today: "2026-11-05", launch, enabled: ["soccer", "rugby"] });
    expect(items.some((i) => i.stage === "live")).toBe(false);
  });
});
