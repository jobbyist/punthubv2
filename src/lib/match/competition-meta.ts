import { competitions } from "@/lib/sports/competitions";

/**
 * A short, original monogram for each competition (no league logos: those are the organisers' trademarks and
 * Puntr has no licence to show them). Tones use existing brand tokens only.
 */
export type CompetitionTone = "ink" | "primary" | "soft";

const SHORT: Record<string, string> = {
  psl: "PSL",
  epl: "EPL",
  ucl: "UCL",
  uel: "UEL",
  uecl: "UECL",
  laliga: "LIGA",
  seriea: "SA",
  bundesliga: "BUN",
  ligue1: "L1",
  facup: "FAC",
  eflcup: "EFL",
  championship: "CHA",
  eredivisie: "ERE",
  primeira: "POR",
  "saudi-pro": "SPL",
  nedbank: "NED",
  mtn8: "MTN8",
  "sa-championship": "MFC",
  "caf-cl": "CAF",
  "caf-cc": "CAFCC",
  afcon: "AFCON",
  "wcq-caf": "WCQ",
  "bafana-friendlies": "RSA",
  urc: "URC",
  "springbok-tests": "BOKS",
};

const TONE: Record<string, CompetitionTone> = {
  psl: "primary",
  nedbank: "primary",
  mtn8: "primary",
  "sa-championship": "primary",
  "bafana-friendlies": "primary",
  afcon: "primary",
  "wcq-caf": "primary",
  ucl: "ink",
  uel: "ink",
  uecl: "ink",
  "caf-cl": "ink",
  "caf-cc": "ink",
};

export type CompetitionRegion = "sa" | "england" | "europe" | "africa" | "world";

const REGION: Record<string, CompetitionRegion> = {
  psl: "sa",
  nedbank: "sa",
  mtn8: "sa",
  "sa-championship": "sa",
  "bafana-friendlies": "sa",
  epl: "england",
  championship: "england",
  facup: "england",
  eflcup: "england",
  ucl: "europe",
  uel: "europe",
  uecl: "europe",
  laliga: "europe",
  seriea: "europe",
  bundesliga: "europe",
  ligue1: "europe",
  eredivisie: "europe",
  primeira: "europe",
  "caf-cl": "africa",
  "caf-cc": "africa",
  afcon: "africa",
  "wcq-caf": "africa",
};

export const REGIONS: CompetitionRegion[] = ["sa", "england", "europe", "africa", "world"];

export interface CompetitionMeta {
  key: string | null;
  short: string;
  tone: CompetitionTone;
  region: CompetitionRegion;
}

export function competitionMeta(name: string): CompetitionMeta {
  const c = competitions.find((x) => x.name === name);
  if (c)
    return {
      key: c.key,
      short: SHORT[c.key] ?? initials(name),
      tone: TONE[c.key] ?? "soft",
      region: REGION[c.key] ?? "world",
    };
  return { key: null, short: initials(name), tone: "soft", region: "world" };
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w));
  return (
    words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Competitions PFIE fetches (kept equal to the keys of PFIE_SOURCES by a test), in display order. */
export const TRACKED_COMPETITIONS = [
  "psl",
  "nedbank",
  "sa-championship",
  "bafana-friendlies",
  "epl",
  "championship",
  "facup",
  "eflcup",
  "ucl",
  "uel",
  "uecl",
  "laliga",
  "seriea",
  "bundesliga",
  "ligue1",
  "eredivisie",
  "primeira",
  "caf-cl",
  "caf-cc",
  "afcon",
  "saudi-pro",
] as const;
