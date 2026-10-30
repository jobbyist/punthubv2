import { createServerFn } from "@tanstack/react-start";

import { launchDate } from "@/lib/launch";
import { sastDate } from "@/lib/sast";

export type RoadmapStatus = {
  today: string;
  launch: string;
  /**
   * Sports switched on for the fixtures sync (SPORTS_ENABLED) that the sync can actually fetch (they have
   * competitions in the registry). Nothing else is ever shown as live, so setting SPORTS_ENABLED early for a
   * sport without a pipeline can't advertise coverage that doesn't exist.
   */
  enabled: string[];
  checkedAt: string;
};

/** Live status for /roadmap, read on every request from the same switch the fixtures sync uses. */
export const getRoadmapStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<RoadmapStatus> => {
    const { competitions, enabledSports } = await import("@/lib/sports/competitions");
    const supported = new Set<string>(competitions.map((c) => c.sport));
    const now = new Date();
    return {
      today: sastDate(now),
      launch: launchDate(process.env["LAUNCH_DATE"]),
      enabled: [...enabledSports()].filter((s) => supported.has(s)),
      checkedAt: now.toISOString(),
    };
  },
);
