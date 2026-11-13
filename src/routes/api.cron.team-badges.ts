import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Resolves real team badges for teams in fixtures (Parallel Search -> Wikipedia crest -> mirrored to Storage).
 * pg_cron at :07 and :37 every hour; up to 8 teams per run within the shared Parallel quota.
 * `?limit=N` (max 25), `?force=1` retries failed teams now.
 */
export const Route = createFileRoute("/api/cron/team-badges")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        const url = new URL(request.url);
        const limit = Math.min(25, Math.max(1, Number(url.searchParams.get("limit")) || 8));
        const force = url.searchParams.get("force") === "1";
        try {
          const { runBadgeJob } = await import("@/lib/badges/resolve.server");
          return Response.json({ ok: true, ...(await runBadgeJob(limit, force)) });
        } catch (error) {
          console.error("team-badges: run failed", error);
          return Response.json({ ok: false, error: "run_failed" }, { status: 500 });
        }
      },
    },
  },
});
