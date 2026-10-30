/**
 * Sports roadmap (owner decision, 30 Oct 2026). Weeks count from launch: week 1 is launch week.
 * Status is never inferred from the date alone: a sport shows as live only when it is switched on
 * (SPORTS_ENABLED) and the launch date has passed. Relative imports only (used on server and client).
 */
import { addDays } from "./launch";

export type RoadmapSport =
  "soccer" | "basketball" | "rugby" | "racing" | "combat" | "cricket" | "tennis";

export const SPORT_ROADMAP: readonly { sport: RoadmapSport; weeks: readonly [number, number] }[] = [
  { sport: "soccer", weeks: [1, 1] },
  { sport: "basketball", weeks: [2, 2] },
  { sport: "rugby", weeks: [2, 2] },
  { sport: "racing", weeks: [4, 4] },
  { sport: "combat", weeks: [6, 8] },
  { sport: "cricket", weeks: [10, 10] },
  { sport: "tennis", weeks: [12, 12] },
] as const;

/** live: on Puntr now. launching: soccer before launch day. inProgress: target window reached, not live yet. next: the next planned window. planned: later. */
export type RoadmapStage = "live" | "launching" | "inProgress" | "next" | "planned";

export type RoadmapItem = {
  sport: RoadmapSport;
  weeks: readonly [number, number];
  /** First and last day of the target window, YYYY-MM-DD (SAST). */
  from: string;
  to: string;
  stage: RoadmapStage;
};

export function weekWindow(
  launch: string,
  weeks: readonly [number, number],
): { from: string; to: string } {
  return { from: addDays(launch, (weeks[0] - 1) * 7), to: addDays(launch, weeks[1] * 7 - 1) };
}

export function buildRoadmap(input: {
  today: string;
  launch: string;
  enabled: readonly string[];
}): RoadmapItem[] {
  const { today, launch } = input;
  const enabled = new Set(input.enabled.map((s) => s.toLowerCase()));
  const launched = today >= launch;

  const items: RoadmapItem[] = SPORT_ROADMAP.map(({ sport, weeks }) => {
    const { from, to } = weekWindow(launch, weeks);
    let stage: RoadmapStage = "planned";
    if (enabled.has(sport) && launched) stage = "live";
    else if (sport === "soccer" && !launched) stage = "launching";
    else if (today >= from) stage = "inProgress";
    return { sport, weeks, from, to, stage };
  });

  // The earliest upcoming window is "next"; sports that share it (basketball and rugby) are both next.
  const nextFrom = items
    .filter((i) => i.stage === "planned")
    .map((i) => i.from)
    .sort()[0];
  return items.map((i) =>
    i.stage === "planned" && i.from === nextFrom ? { ...i, stage: "next" as const } : i,
  );
}

export function countLive(items: readonly RoadmapItem[]): number {
  return items.filter((i) => i.stage === "live").length;
}
