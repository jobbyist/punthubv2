export const AFFILIATE_STATUSES = [
  "applied",
  "info_requested",
  "approved",
  "live",
  "paused",
  "declined",
  "terminated",
] as const;
export type AffiliateStatus = (typeof AFFILIATE_STATUSES)[number];

/** Whole days from today to a YYYY-MM-DD date (negative when past). */
export function daysUntil(date: string | null, now: Date = new Date()): number | null {
  if (!date) return null;
  const target = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}
