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
  nedbank: "NED",
  mtn8: "MTN8",
  "sa-championship": "MFC",
  "caf-cl": "CAF",
  "caf-cc": "CC",
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

export interface CompetitionMeta {
  key: string | null;
  short: string;
  tone: CompetitionTone;
}

export function competitionMeta(name: string): CompetitionMeta {
  const c = competitions.find((x) => x.name === name);
  if (c) return { key: c.key, short: SHORT[c.key] ?? initials(name), tone: TONE[c.key] ?? "soft" };
  return { key: null, short: initials(name), tone: "soft" };
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
