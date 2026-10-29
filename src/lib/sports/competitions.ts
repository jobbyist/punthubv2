import type { Sport } from "./types";

export type CompetitionKey =
  | "psl"
  | "epl"
  | "ucl"
  | "uel"
  | "uecl"
  | "laliga"
  | "seriea"
  | "bundesliga"
  | "ligue1"
  | "facup"
  | "eflcup"
  | "nedbank"
  | "mtn8"
  | "sa-championship"
  | "caf-cl"
  | "caf-cc"
  | "afcon"
  | "wcq-caf"
  | "bafana-friendlies"
  | "urc"
  | "springbok-tests";

export interface Competition {
  key: CompetitionKey;
  sport: Sport;
  /** Stored in fixtures.competition and shown to members. A proper noun: never translated. */
  name: string;
  /**
   * How the provider numbers seasons. "july": a season that starts in the second half of the year is named
   * for that year (Aug 2026 to May 2027 is 2026). "calendar": the calendar year.
   */
  seasonRule: "july" | "calendar";
  /** Search terms used only by scripts/print-league-ids.ts to list candidate leagues. Nothing is guessed at runtime. */
  searches: string[];
  /** Keep only fixtures where either team name contains this text (used for Springbok Tests). */
  teamIncludes?: string;
}

/**
 * Launch scope: football (Betway Premiership/PSL, EPL, UCL and more). Rugby comes after launch.
 * League IDs are NOT written here. Run `bun run sports:ids`, choose the right league for each competition and
 * set SPORTS_LEAGUE_IDS in the environment, e.g. {"psl":123,"epl":456}. A competition without an ID is skipped.
 */
export const competitions: readonly Competition[] = [
  {
    key: "psl",
    sport: "soccer",
    name: "Betway Premiership",
    seasonRule: "july",
    searches: ["Premier Soccer League", "Betway Premiership"],
  },
  {
    key: "epl",
    sport: "soccer",
    name: "Premier League",
    seasonRule: "july",
    searches: ["Premier League"],
  },
  {
    key: "ucl",
    sport: "soccer",
    name: "UEFA Champions League",
    seasonRule: "july",
    searches: ["UEFA Champions League"],
  },
  {
    key: "uel",
    sport: "soccer",
    name: "UEFA Europa League",
    seasonRule: "july",
    searches: ["Europa League"],
  },
  {
    key: "uecl",
    sport: "soccer",
    name: "UEFA Conference League",
    seasonRule: "july",
    searches: ["Conference League"],
  },
  {
    key: "laliga",
    sport: "soccer",
    name: "La Liga",
    seasonRule: "july",
    searches: ["La Liga"],
  },
  {
    key: "seriea",
    sport: "soccer",
    name: "Serie A",
    seasonRule: "july",
    searches: ["Serie A"],
  },
  {
    key: "bundesliga",
    sport: "soccer",
    name: "Bundesliga",
    seasonRule: "july",
    searches: ["Bundesliga"],
  },
  {
    key: "ligue1",
    sport: "soccer",
    name: "Ligue 1",
    seasonRule: "july",
    searches: ["Ligue 1"],
  },
  {
    key: "facup",
    sport: "soccer",
    name: "FA Cup",
    seasonRule: "july",
    searches: ["FA Cup"],
  },
  {
    key: "eflcup",
    sport: "soccer",
    name: "EFL Cup",
    seasonRule: "july",
    searches: ["EFL Cup", "League Cup"],
  },
  {
    key: "nedbank",
    sport: "soccer",
    name: "Nedbank Cup",
    seasonRule: "july",
    searches: ["Nedbank"],
  },
  {
    key: "mtn8",
    sport: "soccer",
    name: "MTN8",
    seasonRule: "july",
    searches: ["MTN8", "MTN 8"],
  },
  {
    key: "sa-championship",
    sport: "soccer",
    name: "Motsepe Foundation Championship",
    seasonRule: "july",
    searches: ["Motsepe", "National First Division"],
  },
  {
    key: "caf-cl",
    sport: "soccer",
    name: "CAF Champions League",
    seasonRule: "july",
    searches: ["CAF Champions League"],
  },
  {
    key: "caf-cc",
    sport: "soccer",
    name: "CAF Confederation Cup",
    seasonRule: "july",
    searches: ["CAF Confederation Cup"],
  },
  {
    key: "afcon",
    sport: "soccer",
    name: "Africa Cup of Nations",
    // Assumption to confirm with the printed league list: the tournament is numbered by calendar year.
    seasonRule: "calendar",
    searches: ["Africa Cup of Nations"],
  },
  {
    key: "wcq-caf",
    sport: "soccer",
    name: "World Cup Qualifiers (Africa)",
    seasonRule: "calendar",
    searches: ["World Cup - Qualification Africa", "World Cup Qualification Africa"],
    teamIncludes: "South Africa",
  },
  {
    key: "bafana-friendlies",
    sport: "soccer",
    name: "Bafana Bafana friendlies",
    seasonRule: "calendar",
    searches: ["Friendlies", "International Friendlies"],
    teamIncludes: "South Africa",
  },
  {
    key: "urc",
    sport: "rugby",
    name: "United Rugby Championship",
    seasonRule: "july",
    searches: ["United Rugby Championship"],
  },
  {
    key: "springbok-tests",
    sport: "rugby",
    name: "Springbok Tests",
    // Assumption to confirm with the printed league list: internationals are numbered by calendar year.
    seasonRule: "calendar",
    searches: [
      "International",
      "Autumn Nations Series",
      "Rugby Championship",
      "Summer Internationals",
    ],
    teamIncludes: "South Africa",
  },
] as const;

/**
 * Sports the sync fetches. Football only at launch; rugby and horse racing are added after launch by setting
 * SPORTS_ENABLED (for example "soccer,rugby"). Anything not listed is never requested, so it costs no quota
 * and needs no subscription.
 */
export function enabledSports(
  raw: string | undefined = process.env["SPORTS_ENABLED"],
): Set<string> {
  const list = (raw ?? "soccer")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list.length ? list : ["soccer"]);
}

export function activeCompetitions(raw?: string): Competition[] {
  const sports = enabledSports(raw);
  return competitions.filter((c) => sports.has(c.sport));
}

export function seasonFor(rule: Competition["seasonRule"], date: Date): number {
  const year = date.getUTCFullYear();
  if (rule === "calendar") return year;
  return date.getUTCMonth() >= 6 ? year : year - 1;
}

/** Parses SPORTS_LEAGUE_IDS. Ignores anything that is not a known competition key mapped to a positive integer. */
export function parseLeagueIds(raw: string | undefined): Partial<Record<CompetitionKey, number>> {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<CompetitionKey, number>> = {};
    for (const c of competitions) {
      const v = data[c.key];
      if (typeof v === "number" && Number.isInteger(v) && v > 0) out[c.key] = v;
    }
    return out;
  } catch {
    return {};
  }
}
