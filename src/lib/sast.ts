/** Today's date in South Africa as YYYY-MM-DD (UTC+2, no daylight saving). */
export function sastDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
}
