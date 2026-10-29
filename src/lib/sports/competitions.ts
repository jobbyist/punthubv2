import type { Sport } from "./types";

export type CompetitionKey = "psl" | "epl" | "ucl" | "urc" | "springbok-tests";

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
 * Launch scope: soccer (Betway Premiership/PSL, EPL, UCL) and rugby (URC, Springbok Tests).
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
