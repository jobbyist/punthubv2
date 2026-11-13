/** Editorial calendar: which kind of article a given South African day gets, and the job key that makes a run idempotent. */
import { sastDate } from "@/lib/sast";

import type { ContentKind, ContentSettings } from "./types";

/** One job per South African calendar day. A second cron call for the same day finds the key taken and stops. */
export function dailyJobKey(now: Date = new Date()): string {
  return `daily:${sastDate(now)}`;
}

/** Whole days since 1 Jan 1970 for the South African date, so the rotation never depends on the server clock zone. */
export function sastDayNumber(now: Date = new Date()): number {
  return Math.floor(Date.parse(`${sastDate(now)}T00:00:00Z`) / 86_400_000);
}

/**
 * Sports intelligence and Puntr development news alternate day by day. An administrator's one-off override wins,
 * then a fixed schedule mode. Development news is only possible when an approved project update is waiting:
 * with none, the day falls back to sports, so nothing about Puntr is ever invented to fill a slot.
 */
export function kindForDay(
  settings: Pick<ContentSettings, "scheduleMode" | "nextKindOverride">,
  hasApprovedUpdates: boolean,
  now: Date = new Date(),
): { kind: ContentKind; reason: string } {
  let wanted: ContentKind;
  let reason: string;
  if (settings.nextKindOverride) {
    wanted = settings.nextKindOverride;
    reason = "administrator override";
  } else if (settings.scheduleMode !== "alternate") {
    wanted = settings.scheduleMode;
    reason = `schedule mode ${settings.scheduleMode}`;
  } else {
    wanted = sastDayNumber(now) % 2 === 0 ? "sports" : "development";
    reason = "daily rotation";
  }
  if (wanted === "development" && !hasApprovedUpdates) {
    return {
      kind: "sports",
      reason: `${reason}; no approved project update waiting, so sports instead`,
    };
  }
  return { kind: wanted, reason };
}

/** 06:00 SAST is 04:00 UTC all year (South Africa has no daylight saving). */
export const DAILY_CRON_UTC = "0 4 * * *";

export function nextRunAt(now: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
