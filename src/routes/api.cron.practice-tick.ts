import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Practice Mode clock. Safe to call repeatedly (pg_cron calls it every 2 minutes):
 *   1. makes sure there is an active fictional season (14 rounds, 56 fixtures, seeded results kept secret);
 *   2. reveals the full-time score of every fixture whose time has come;
 *   3. settles practice picks with the real grader and awards practice points (once per pick);
 *   4. when every fixture is finished and settled, closes the season and starts the next one.
 *
 *   GET /api/cron/practice-tick                        normal tick
 *   GET /api/cron/practice-tick?dry=1                  reports what it would do, writes nothing
 *   GET /api/cron/practice-tick?new=1                  plays the rest of the current season out now (honest seeded scores),
 *                                                      settles it and starts a new one
 *   GET /api/cron/practice-tick?new=1&accelerated=1    same, and the new season runs fast (a round every 5 minutes)
 *   GET /api/cron/practice-tick?new=1&round_seconds=N  same, with a round every N seconds (60 to 7200)
 *
 * Practice data lives only in practice_* tables. It never touches the real fixtures, predictions or leaderboards.
 */
export const Route = createFileRoute("/api/cron/practice-tick")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const params = new URL(request.url).searchParams;
        const dry = params.get("dry") === "1";
        const forceNew = params.get("new") === "1";

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { buildSeason, ACCELERATED_TIMING } = await import("@/lib/practice/simulator");
        const { settlePracticePicks } = await import("@/lib/practice/settle");

        const { data: settings, error: settingsError } = await db
          .from("practice_settings")
          .select("enabled, round_seconds, lock_seconds, full_time_seconds")
          .eq("id", 1)
          .maybeSingle();
        if (settingsError || !settings) {
          console.error("practice-tick settings failed", settingsError?.message);
          return Response.json({ ok: false, error: "settings_failed" }, { status: 500 });
        }

        // Timing for a NEW season: query overrides, else the saved defaults.
        const asked = Number(params.get("round_seconds"));
        const roundSeconds =
          params.get("accelerated") === "1"
            ? ACCELERATED_TIMING.roundSeconds
            : Number.isFinite(asked) && asked >= 60 && asked <= 7200
              ? Math.floor(asked)
              : settings.round_seconds;
        const lockSeconds =
          params.get("accelerated") === "1"
            ? ACCELERATED_TIMING.lockSeconds
            : Math.min(settings.lock_seconds, Math.max(10, Math.floor(roundSeconds / 4)));
        const fullTimeSeconds =
          params.get("accelerated") === "1"
            ? ACCELERATED_TIMING.fullTimeSeconds
            : Math.min(settings.full_time_seconds, Math.max(30, Math.floor(roundSeconds / 2)));

        const now = new Date();
        const summary = {
          seasonCreated: false,
          fixturesFinished: 0,
          picksSettled: 0,
          pointsAwarded: 0,
          seasonClosed: false,
        };

        async function createSeason(): Promise<boolean> {
          const { data: last } = await db
            .from("practice_seasons")
            .select("number")
            .order("number", { ascending: false })
            .limit(1)
            .maybeSingle();
          const number = (last?.number ?? 0) + 1;
          const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
          const { data: season, error } = await db
            .from("practice_seasons")
            .insert({
              number,
              seed,
              started_at: now.toISOString(),
              round_seconds: roundSeconds,
              lock_seconds: lockSeconds,
              full_time_seconds: fullTimeSeconds,
            })
            .select("id")
            .single();
          if (error || !season) {
            // 23505 = another tick already opened a season; that is fine.
            if (error?.code !== "23505")
              console.error("practice-tick season failed", error?.message);
            return false;
          }
          const planned = buildSeason(seed, {
            startMs: now.getTime(),
            roundSeconds,
            lockSeconds,
            fullTimeSeconds,
          });
          const { data: rows, error: fixError } = await db
            .from("practice_fixtures")
            .insert(
              planned.map((f) => ({
                season_id: season.id,
                round: f.round,
                home: f.home,
                away: f.away,
                kickoff_at: new Date(f.kickoffMs).toISOString(),
                lambda_home: f.lambdaHome,
                lambda_away: f.lambdaAway,
                odds: f.odds,
              })),
            )
            .select("id, round, home, away");
          if (fixError || !rows) {
            console.error("practice-tick fixtures failed", fixError?.message);
            await db.from("practice_seasons").delete().eq("id", season.id);
            return false;
          }
          const key = (r: { round: number; home: string; away: string }) =>
            `${r.round}|${r.home}|${r.away}`;
          const byKey = new Map(planned.map((f) => [key(f), f]));
          const plans = rows.flatMap((r) => {
            const f = byKey.get(key(r));
            return f
              ? [{ fixture_id: r.id, planned_home: f.plannedHome, planned_away: f.plannedAway }]
              : [];
          });
          const { error: planError } = await db.from("practice_fixture_plans").insert(plans);
          if (planError || plans.length !== rows.length) {
            console.error("practice-tick plans failed", planError?.message);
            await db.from("practice_seasons").delete().eq("id", season.id);
            return false;
          }
          return true;
        }

        // 1. Active season.
        const { data: active } = await db
          .from("practice_seasons")
          .select("id, full_time_seconds")
          .eq("status", "active")
          .maybeSingle();
        if (!active) {
          if (dry) return Response.json({ ok: true, dry: true, wouldCreateSeason: true });
          summary.seasonCreated = await createSeason();
          return Response.json({ ok: true, ...summary });
        }

        // 2. Reveal full-time scores that are due (all of them when new=1).
        let dueQuery = db
          .from("practice_fixtures")
          .select("id")
          .eq("season_id", active.id)
          .eq("status", "scheduled");
        if (!forceNew) {
          const cutoff = new Date(now.getTime() - active.full_time_seconds * 1000).toISOString();
          dueQuery = dueQuery.lte("kickoff_at", cutoff);
        }
        const { data: due } = await dueQuery;
        if (dry) {
          return Response.json({ ok: true, dry: true, fixturesDue: due?.length ?? 0, forceNew });
        }
        if (due && due.length > 0) {
          const { data: plans } = await db
            .from("practice_fixture_plans")
            .select("fixture_id, planned_home, planned_away")
            .in(
              "fixture_id",
              due.map((d) => d.id),
            );
          for (const plan of plans ?? []) {
            const { error } = await db
              .from("practice_fixtures")
              .update({
                status: "finished",
                home_score: plan.planned_home,
                away_score: plan.planned_away,
              })
              .eq("id", plan.fixture_id)
              .eq("status", "scheduled");
            if (error) console.error("practice-tick finish failed", error.message);
            else summary.fixturesFinished += 1;
          }
        }

        // 3. Settle picks on finished fixtures. Award first (idempotent), then mark settled, so a failed update is
        //    retried on the next tick without ever paying twice.
        const { data: open } = await db
          .from("practice_predictions")
          .select("id, fixture_id, user_id, market, selection, odds")
          .is("result", null)
          .limit(1000);
        if (open && open.length > 0) {
          const { data: finished } = await db
            .from("practice_fixtures")
            .select("id, home_score, away_score")
            .eq("status", "finished")
            .in("id", [...new Set(open.map((p) => p.fixture_id))]);
          const settlements = settlePracticePicks(
            open.map((p) => ({ ...p, odds: Number(p.odds) })),
            (finished ?? []).flatMap((f) =>
              f.home_score === null || f.away_score === null
                ? []
                : [{ id: f.id, home_score: f.home_score, away_score: f.away_score }],
            ),
          );
          for (const s of settlements) {
            const { data: awarded, error: awardError } = await db.rpc("practice_award", {
              p_user: s.user_id,
              p_rule: "pick_settled",
              p_ref: s.id,
            });
            if (awardError) {
              console.error("practice-tick award failed", awardError.message);
              continue;
            }
            summary.pointsAwarded += awarded ?? 0;
            const { error } = await db
              .from("practice_predictions")
              .update({ result: s.result, units: s.units, settled_at: now.toISOString() })
              .eq("id", s.id)
              .is("result", null);
            if (error) console.error("practice-tick settle failed", error.message);
            else summary.picksSettled += 1;
          }
        }

        // 4. Close a finished season and open the next one.
        const { count: remaining } = await db
          .from("practice_fixtures")
          .select("id", { count: "exact", head: true })
          .eq("season_id", active.id)
          .eq("status", "scheduled");
        if ((remaining ?? 1) === 0) {
          const { count: unsettled } = await db
            .from("practice_predictions")
            .select("id, practice_fixtures!inner(season_id)", { count: "exact", head: true })
            .is("result", null)
            .eq("practice_fixtures.season_id", active.id);
          if ((unsettled ?? 1) === 0) {
            const { error } = await db
              .from("practice_seasons")
              .update({ status: "finished" })
              .eq("id", active.id);
            if (!error) {
              summary.seasonClosed = true;
              summary.seasonCreated = await createSeason();
            }
          }
        }

        console.info("practice-tick", JSON.stringify(summary));
        return Response.json({ ok: true, ...summary });
      },
    },
  },
});
