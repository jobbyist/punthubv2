/** Kick-off times: a local date and time plus a zone become one UTC instant, so sources in different zones compare. */

const LABEL_ZONES: Record<string, string> = {
  SAST: "Africa/Johannesburg",
  CAT: "Africa/Johannesburg",
  GMT: "UTC",
  UTC: "UTC",
  BST: "Europe/London",
  UK: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  ET: "America/New_York",
  EST: "America/New_York",
  EDT: "America/New_York",
  WAT: "Africa/Lagos",
  EAT: "Africa/Nairobi",
};

/** Sites that always print times in one zone. A site not listed here must state its zone on the page. */
const DOMAIN_ZONES: [RegExp, string][] = [
  [/(^|\.)psl\.co\.za$/, "Africa/Johannesburg"],
  [/(^|\.)supersport\.com$/, "Africa/Johannesburg"],
  [/(^|\.)kickoff\.com$/, "Africa/Johannesburg"],
  [/\.co\.za$/, "Africa/Johannesburg"],
  [/(^|\.)bbc\.(com|co\.uk)$/, "Europe/London"],
  [/(^|\.)skysports\.com$/, "Europe/London"],
  [/(^|\.)premierleague\.com$/, "Europe/London"],
  [/(^|\.)theguardian\.com$/, "Europe/London"],
];

export function zoneFor(label: string | null, domain: string): string | null {
  const key = (label ?? "").trim().toUpperCase();
  if (key && LABEL_ZONES[key]) return LABEL_ZONES[key];
  if (key) return null; // a label we do not know is not guessed
  return DOMAIN_ZONES.find(([pattern]) => pattern.test(domain))?.[1] ?? null;
}

function offsetMinutes(zone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** `date` YYYY-MM-DD and `time` HH:MM in `zone` -> ISO UTC instant, or null when the input is not a real time. */
export function zonedToUtc(date: string, time: string, zone: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, day, h, mi] = [
    Number(d[1]),
    Number(d[2]),
    Number(d[3]),
    Number(t[1]),
    Number(t[2]),
  ];
  if (mo < 1 || mo > 12 || day < 1 || day > 31 || h > 23 || mi > 59) return null;
  const naive = Date.UTC(y, mo - 1, day, h, mi);
  if (new Date(naive).getUTCDate() !== day) return null;
  let utc = naive - offsetMinutes(zone, naive) * 60_000;
  utc = naive - offsetMinutes(zone, utc) * 60_000;
  return new Date(utc).toISOString();
}
