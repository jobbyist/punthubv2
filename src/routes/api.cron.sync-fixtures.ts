import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/sync-fixtures")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { createSportsProvider } = await import("@/lib/sports/select.server");
        const provider = await createSportsProvider();
        if (!provider)
          return Response.json({ ok: false, error: "sports_api_not_configured" }, { status: 503 });

        const { syncFixtures, syncFixturesByCompetition } =
          await import("@/lib/sports/sync.server");
        const { createFixtureStore } = await import("@/lib/sports/store.server");
        try {
          if (provider.name === "pfie") {
            // PFIE reads pages and calls a model per competition (~15-60 s each), so one call cannot cover all
            // 21 competitions. Each call takes the competitions not synced in the last 12 hours, oldest first,
            // and writes each one as it finishes. The 04:00-04:40 SAST schedule calls this several times.
            const { orderForFixtureSync } = await import("@/lib/sports/fixture-order.server");
            const url = new URL(request.url);
            const force = url.searchParams.get("force") === "1";
            const keys = await orderForFixtureSync({ staleHours: force ? 0 : 12 });
            const report = await syncFixturesByCompetition(provider, createFixtureStore(), keys);
            console.info("sync-fixtures", JSON.stringify(report));
            return Response.json(report);
          }
          const report = await syncFixtures(provider, createFixtureStore());
          console.info("sync-fixtures", JSON.stringify(report));
          return Response.json(report);
        } catch (error) {
          console.error("sync-fixtures failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
