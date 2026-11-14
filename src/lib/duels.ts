import { grade } from "./settlement";

/**
 * Community Head-to-Head Duels. The database owns escrow and status (supabase/migrations/*_h2h_duels.sql);
 * this module grades calls with the same grade() as every pick, so a duel can never be scored differently from a
 * normal pick on the same match.
 */
export type DuelMarket = "1X2" | "BTTS" | "OU25";
export const DUEL_MARKETS: DuelMarket[] = ["1X2", "BTTS", "OU25"];
export const DUEL_SELECTIONS: Record<DuelMarket, string[]> = {
  "1X2": ["home", "draw", "away"],
  BTTS: ["yes", "no"],
  OU25: ["over", "under"],
};

export type DuelStatus =
  "pending" | "active" | "settled" | "void" | "declined" | "cancelled" | "expired";

export interface DuelCall {
  market: DuelMarket;
  selection: string;
}

/** 2 or 3 distinct markets, each with a valid selection. Mirrors duel_check_picks() in the database. */
export function validCalls(calls: DuelCall[]): boolean {
  const markets = new Set(calls.map((c) => c.market));
  return (
    calls.length >= 2 &&
    calls.length <= 3 &&
    markets.size === calls.length &&
    calls.every((c) => DUEL_SELECTIONS[c.market]?.includes(c.selection))
  );
}

export interface SettleRow {
  duel_id: string;
  fixture_status: string;
  home_score: number | null;
  away_score: number | null;
  user_id: string;
  market: string;
  selection: string;
}

export interface DuelVerdict {
  duelId: string;
  void: boolean;
  results: { user_id: string; market: string; correct: boolean }[];
}

/**
 * Groups calls per duel and grades them. A void fixture voids the duel. A duel with any call that cannot be
 * graded yet (final with no score) is left for a later run.
 */
export function gradeDuels(rows: SettleRow[]): DuelVerdict[] {
  const byDuel = new Map<string, SettleRow[]>();
  for (const r of rows) byDuel.set(r.duel_id, [...(byDuel.get(r.duel_id) ?? []), r]);
  const out: DuelVerdict[] = [];
  for (const [duelId, calls] of byDuel) {
    const f = calls[0]!;
    if (["postponed", "abandoned", "cancelled"].includes(f.fixture_status)) {
      out.push({ duelId, void: true, results: [] });
      continue;
    }
    const fixture = {
      status: f.fixture_status,
      home_score: f.home_score,
      away_score: f.away_score,
    };
    const results: DuelVerdict["results"] = [];
    let complete = true;
    for (const c of calls) {
      const g = grade(c.market, c.selection, null, 2, fixture);
      if (!g || g.result === "void") {
        complete = false;
        break;
      }
      results.push({ user_id: c.user_id, market: c.market, correct: g.result === "won" });
    }
    if (complete) out.push({ duelId, void: false, results });
  }
  return out;
}

export interface DuelSettleStore {
  expire(): Promise<number>;
  toSettle(): Promise<SettleRow[]>;
  settle(v: DuelVerdict): Promise<string>;
}

export async function runDuelSettlement(store: DuelSettleStore) {
  const expired = await store.expire();
  const verdicts = gradeDuels(await store.toSettle());
  const outcomes: Record<string, number> = {};
  for (const v of verdicts) {
    const r = await store.settle(v);
    outcomes[r] = (outcomes[r] ?? 0) + 1;
  }
  return { expired, graded: verdicts.length, outcomes };
}

/** Error codes raised by the duel functions, mapped to translation keys under duels:errors. */
export const DUEL_ERRORS = [
  "not_authenticated",
  "not_launched",
  "duels_paused",
  "stakes_paused",
  "invalid_picks",
  "invalid_amount",
  "account_too_new",
  "daily_cap",
  "insufficient_transferable",
  "fixture_closed",
  "recipient_not_found",
  "recipient_unavailable",
  "self_duel",
  "pair_limit",
  "open_limit",
  "duplicate_duel",
  "duel_unavailable",
  "voting_closed",
  "voting_not_open",
  "participant_vote",
  "note_too_long",
  "banned",
  "suspended",
  "limited",
  "age_not_attested",
] as const;

export function duelErrorKey(message: string | undefined): string {
  const hit = DUEL_ERRORS.find((c) => message?.includes(c));
  return `errors.${hit ?? "generic"}`;
}
