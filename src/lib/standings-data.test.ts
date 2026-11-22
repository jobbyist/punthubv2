import { describe, expect, it } from "vitest";

import { freshStandingsKeys, type SyncStatus } from "./standings-data";

const now = Date.parse("2026-11-22T20:00:00.000Z");
const status = (scope: string, lastSuccess: string | null, failures = 0): SyncStatus => ({
  job: "standings",
  scope,
  last_attempt_at: lastSuccess,
  last_success_at: lastSuccess,
  last_synced_at: lastSuccess,
  consecutive_failures: failures,
  last_error: failures ? "sync failed" : null,
  meta: {},
});

describe("freshStandingsKeys", () => {
  it("exposes only configured competitions with a successful sync in the last 18 hours", () => {
    const statuses = [
      status("psl", "2026-11-22T15:00:00.000Z"),
      status("epl", "2026-11-22T00:00:00.000Z"),
      status("seriea", "2026-11-22T19:00:00.000Z", 1),
      status("laliga", "2026-11-15T02:20:00.000Z"),
    ];
    expect(freshStandingsKeys(["psl", "epl", "seriea", "laliga", "ucl"], statuses, now)).toEqual([
      "psl",
    ]);
  });
});
