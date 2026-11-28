import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const Route = createFileRoute("/api/cron/synthetic-decisions-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as SupabaseClient;
        const slug = "puntr-30-day-synthetic-2026-11-27";
        const { data: experiment, error: experimentError } = await db
          .from("synthetic_experiments")
          .select("id,status,starts_at,ends_at")
          .eq("slug", slug)
          .maybeSingle();
        if (experimentError || !experiment) {
          return Response.json({ ok: true, skipped: true, reason: "experiment_not_configured" });
        }
        if (experiment.status !== "active") {
          return Response.json({
            ok: true,
            skipped: true,
            reason: `experiment_${experiment.status}`,
          });
        }

        const now = new Date();
        if (
          now.getTime() < Date.parse(experiment.starts_at) ||
          now.getTime() > Date.parse(experiment.ends_at)
        ) {
          return Response.json({ ok: true, skipped: true, reason: "outside_experiment_window" });
        }

        // Compute the SAST calendar-day boundary (UTC+02:00) so a persona gets at most one fixture batch per day.
        const sastDay = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const dayStart = new Date(`${sastDay}T00:00:00+02:00`).toISOString();
        const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const { data: personas, error: personaError } = await db
          .from("synthetic_personas")
          .select("persona_key,persona,last_decision_at")
          .eq("experiment_id", experiment.id)
          .eq("active", true)
          .or(`last_decision_at.is.null,last_decision_at.lt.${dayStart}`)
          .order("last_decision_at", { ascending: true, nullsFirst: true })
          .limit(100);
        if (personaError) {
          return Response.json({ ok: false, error: "could_not_load_personas" }, { status: 500 });
        }
        if (!personas?.length) {
          return Response.json({
            ok: true,
            skipped: true,
            reason: "all_personas_have_daily_decisions",
            sast_day: sastDay,
          });
        }

        const { data: fixtures, error: fixtureError } = await db
          .from("fixtures")
          .select("provider,provider_ref,competition,home,away,kickoff_at")
          .eq("status", "scheduled")
          .gte("kickoff_at", now.toISOString())
          .lte("kickoff_at", horizon)
          .order("kickoff_at", { ascending: true })
          .limit(250);
        if (fixtureError) {
          return Response.json(
            { ok: false, error: "could_not_load_upcoming_fixtures" },
            { status: 500 },
          );
        }
        if (!fixtures?.length) {
          return Response.json({
            ok: true,
            skipped: true,
            reason: "no_upcoming_fixtures_in_24h",
            sast_day: sastDay,
          });
        }

        const groups = new Map<
          string,
          { fixture: Record<string, unknown>; personaIds: string[] }
        >();
        let skippedNoFixture = 0;
        for (const row of personas) {
          const persona = isRecord(row.persona) ? row.persona : {};
          const competitions = Array.isArray(persona["competitions"])
            ? persona["competitions"].filter((value): value is string => typeof value === "string")
            : [];
          const match = fixtures.find((fixture) =>
            competitions.includes(String(fixture.competition)),
          );
          if (!match) {
            skippedNoFixture += 1;
            continue;
          }
          const key = `${match.provider}:${match.provider_ref}`;
          const current = groups.get(key) || {
            fixture: {
              fixture_id: key,
              home_team: match.home,
              away_team: match.away,
              competition: match.competition,
              kickoff_utc: match.kickoff_at,
            },
            personaIds: [],
          };
          current.personaIds.push(row.persona_key);
          groups.set(key, current);
        }

        if (!groups.size) {
          return Response.json({
            ok: true,
            skipped: true,
            reason: "no_persona_competition_matches",
            sast_day: sastDay,
            skipped_no_fixture: skippedNoFixture,
          });
        }

        const orderedGroups = [...groups.values()]
          .sort(
            (a, b) =>
              Date.parse(String(a.fixture["kickoff_utc"])) -
              Date.parse(String(b.fixture["kickoff_utc"])),
          )
          .slice(0, 5);

        const cronSecret = process.env["CRON_SECRET"];
        if (!cronSecret)
          return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });

        const endpoint = new URL("/api/cron/synthetic-decisions", request.url);
        const successes: {
          fixture_id: string;
          personas: number;
          decisions: number;
          cached: boolean;
        }[] = [];
        const failures: { fixture_id: string; error: string }[] = [];

        for (const group of orderedGroups) {
          const fixtureId = String(group.fixture["fixture_id"]);
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${cronSecret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                experiment_slug: slug,
                fixture: group.fixture,
                persona_ids: group.personaIds,
              }),
              signal: AbortSignal.timeout(60_000),
            });
            const result = (await response.json()) as Record<string, unknown>;
            if (!response.ok || result["ok"] !== true) {
              failures.push({
                fixture_id: fixtureId,
                error: String(result["error"] || response.status),
              });
              continue;
            }
            const { error: updateError } = await db
              .from("synthetic_personas")
              .update({ last_decision_at: new Date().toISOString() })
              .eq("experiment_id", experiment.id)
              .in("persona_key", group.personaIds);
            if (updateError) {
              failures.push({
                fixture_id: fixtureId,
                error: "could_not_update_persona_decision_timestamp",
              });
              continue;
            }
            const resultBody = isRecord(result["result"]) ? result["result"] : {};
            successes.push({
              fixture_id: fixtureId,
              personas: group.personaIds.length,
              decisions:
                typeof resultBody["decision_count"] === "number" ? resultBody["decision_count"] : 0,
              cached: result["cached"] === true,
            });
          } catch (error) {
            failures.push({
              fixture_id: fixtureId,
              error: error instanceof Error ? error.message.slice(0, 200) : "unknown_error",
            });
          }
        }

        return Response.json(
          {
            ok: failures.length === 0,
            sast_day: sastDay,
            fixtures_processed: successes.length,
            personas_decided: successes.reduce((sum, item) => sum + item.personas, 0),
            decisions_created: successes.reduce((sum, item) => sum + item.decisions, 0),
            skipped_no_fixture: skippedNoFixture,
            successes,
            failures,
          },
          { status: failures.length === 0 ? 200 : 500 },
        );
      },
    },
  },
});
