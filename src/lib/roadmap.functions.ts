import { createServerFn } from "@tanstack/react-start";

import { launchDate } from "@/lib/launch";
import { sastDate } from "@/lib/sast";

export type RoadmapStatus = {
  today: string;
  launch: string;
  /** Sports switched on for the fixtures sync (SPORTS_ENABLED). Nothing else is ever shown as live. */
  enabled: string[];
  checkedAt: string;
};

/** Live status for /roadmap, read on every request from the same switch the fixtures sync uses. */
export const getRoadmapStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<RoadmapStatus> => {
    const { enabledSports } = await import("@/lib/sports/competitions");
    const now = new Date();
    return {
      today: sastDate(now),
      launch: launchDate(process.env["LAUNCH_DATE"]),
      enabled: [...enabledSports()],
      checkedAt: now.toISOString(),
    };
  },
);
