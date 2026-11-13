import type { CompetitionKey } from "@/lib/sports/competitions";
import type { FixtureStatus } from "@/lib/sports/types";

export type SourceTier = "official" | "trusted" | "other";

export interface PfieSource {
  index: number;
  url: string;
  domain: string;
  tier: SourceTier;
  text: string;
}

/** What the model says one page states about one match. Untrusted until validated. */
export interface RawObservation {
  source: number;
  home: string;
  away: string;
  date: string;
  time: string | null;
  tz: string | null;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  quote: string;
}

export interface Observation extends RawObservation {
  domain: string;
  tier: SourceTier;
  /** UTC kick-off, when the page gave a time and its zone is known. */
  kickoffUtc: string | null;
}

export interface Rejected {
  raw: RawObservation;
  reason: string;
}

export interface KnownFixture {
  providerRef: string;
  home: string;
  away: string;
  kickoffAt: string;
  status: FixtureStatus;
}

export type Verdict = "verified" | "single_source" | "disputed";

export interface Decision {
  home: string;
  away: string;
  providerRef: string | null;
  kickoffAt: string | null;
  kickoffVerdict: Verdict;
  status: FixtureStatus;
  statusVerdict: Verdict;
  homeScore: number | null;
  awayScore: number | null;
  /** True when this decision may be written to public.fixtures. */
  publish: boolean;
  reason: string;
  sources: string[];
}

export interface PfieStore {
  knownFixtures(competition: string, from: Date, to: Date): Promise<KnownFixture[]>;
  lastRunAt(competition: CompetitionKey, kind: "fixtures" | "results"): Promise<Date | null>;
  recordRun(run: {
    competition: CompetitionKey;
    kind: "fixtures" | "results";
    ok: boolean;
    error?: string;
    model?: string;
    sources: PfieSource[];
    accepted: Observation[];
    rejected: Rejected[];
    decisions: Decision[];
  }): Promise<void>;
  countUsage(provider: string, outcome: "ok" | "error"): Promise<void>;
  usageToday(): Promise<Record<string, number>>;
}
