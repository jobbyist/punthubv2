import { describe, expect, it } from "vitest";

import { buildRoadmap, weekWindow } from "@/lib/roadmap";

const launch = "2026-12-01";
const stage = (items: ReturnType<typeof buildRoadmap>, sport: string) =>
  items.find((i) => i.sport === sport)?.stage;

describe("roadmap", () => {
  it("counts weeks from launch week", () => {
    expect(weekWindow(launch, [1, 1])).toEqual({ from: "2026-12-01", to: "2026-12-07" });
    expect(weekWindow(launch, [6, 9])).toEqual({ from: "2027-01-05", to: "2027-02-01" });
    expect(weekWindow(launch, [14, 17])).toEqual({ from: "2027-03-02", to: "2027-03-29" });
    expect(weekWindow(launch, [23, 26])).toEqual({ from: "2027-05-04", to: "2027-05-31" });
    expect(weekWindow(launch, [32, 35])).toEqual({ from: "2027-07-06", to: "2027-08-02" });
    expect(weekWindow(launch, [41, 44])).toEqual({ from: "2027-09-07", to: "2027-10-04" });
    expect(weekWindow(launch, [50, 53])).toEqual({ from: "2027-11-09", to: "2027-12-06" });
  });

  it("shows soccer as launching before launch day, and basketball and rugby as next", () => {
    const items = buildRoadmap({ today: "2026-11-05", launch, enabled: ["soccer"] });
    expect(stage(items, "soccer")).toBe("launching");
    expect(stage(items, "basketball")).toBe("next");
    expect(stage(items, "rugby")).toBe("next");
    expect(stage(items, "racing")).toBe("planned");
  });

  it("spaces each post-January category by at least one full month", () => {
    const items = buildRoadmap({ today: "2026-11-05", launch, enabled: ["soccer"] });
    const windows = ["racing", "combat", "athletics", "cricket", "tennis"].map((sport) =>
      items.find((i) => i.sport === sport)!.from,
    );
    expect(windows).toEqual([
      "2027-03-02",
      "2027-05-04",
      "2027-07-06",
      "2027-09-07",
      "2027-11-09",
    ]);
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
