/** PFIE audit store on the service-role client. Server only. Untyped view until `types.ts` is regenerated. */
import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { FixtureStatus } from "@/lib/sports/types";

import type { KnownFixture, PfieStore } from "./types";

const db = supabaseAdmin as unknown as SupabaseClient;

export function createPfieStore(): PfieStore {
  return {
    async knownFixtures(competition, from, to): Promise<KnownFixture[]> {
      const { data, error } = await db
        .from("fixtures")
        .select("provider_ref, home, away, kickoff_at, status")
        .eq("provider", "pfie")
        .eq("competition", competition)
        .gte("kickoff_at", from.toISOString())
        .lte("kickoff_at", to.toISOString());
      if (error) throw new Error(`fixtures: ${error.message}`);
      return (
        (data ?? []) as {
          provider_ref: string;
          home: string;
          away: string;
          kickoff_at: string;
          status: string;
        }[]
      ).map((r) => ({
        providerRef: r.provider_ref,
        home: r.home,
        away: r.away,
        kickoffAt: r.kickoff_at,
        status: r.status as FixtureStatus,
      }));
    },

    async lastRunAt(competition, kind) {
      const { data, error } = await db
        .from("pfie_runs")
        .select("started_at")
        .eq("competition", competition)
        .eq("kind", kind)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`pfie_runs: ${error.message}`);
      const at = (data as { started_at?: string } | null)?.started_at;
      return at ? new Date(at) : null;
    },

    async recordRun(run) {
      const { data, error } = await db
        .from("pfie_runs")
        .insert({
          competition: run.competition,
          kind: run.kind,
          ok: run.ok,
          error: run.error ?? null,
          model: run.model ?? null,
          sources: run.sources.map((s) => ({
            n: s.index,
            url: s.url,
            domain: s.domain,
            tier: s.tier,
            hash: createHash("sha256").update(s.text).digest("hex"),
          })),
          decisions: run.decisions,
          accepted_count: run.accepted.length,
          rejected_count: run.rejected.length,
        })
        .select("id")
        .single();
      if (error) throw new Error(`pfie_runs: ${error.message}`);
      const runId = (data as { id: string }).id;
      const url = new Map(run.sources.map((s) => [s.index, s.url]));
      const rows = [
        ...run.accepted.map((o) => ({
          o,
          domain: o.domain,
          tier: o.tier,
          kickoff: o.kickoffUtc,
          reason: null as string | null,
        })),
        ...run.rejected.map((r) => ({
          o: r.raw,
          domain: null,
          tier: null,
          kickoff: null,
          reason: r.reason,
        })),
      ].map(({ o, domain, tier, kickoff, reason }) => ({
        run_id: runId,
        competition: run.competition,
        source_url: url.get(o.source) ?? null,
        domain,
        tier,
        home: o.home.slice(0, 80),
        away: o.away.slice(0, 80),
        match_date: /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null,
        kickoff_utc: kickoff,
        status: o.status,
        home_score: o.homeScore,
        away_score: o.awayScore,
        quote: o.quote.slice(0, 400),
        accepted: reason === null,
        reject_reason: reason,
      }));
      if (rows.length > 0) {
        const res = await db.from("pfie_observations").insert(rows);
        if (res.error) throw new Error(`pfie_observations: ${res.error.message}`);
      }
    },

    async countUsage(provider, outcome) {
      // Calls are counted when the quota is claimed (quota.server.ts); only failures are added here.
      if (outcome !== "error") return;
      const { error } = await db.rpc("api_quota_error", { p_provider: provider });
      if (error) throw new Error(`api_quota_error: ${error.message}`);
    },

    async usageToday() {
      const day = new Date().toISOString().slice(0, 10);
      const { data, error } = await db
        .from("content_api_usage")
        .select("provider, calls")
        .eq("day", day);
      if (error) throw new Error(`content_api_usage: ${error.message}`);
      const out: Record<string, number> = {};
      for (const r of (data ?? []) as { provider: string; calls: number }[])
        out[r.provider] = r.calls;
      return out;
    },
  };
}
