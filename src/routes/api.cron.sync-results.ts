import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/sync-results")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { createProvider } = await import("@/lib/sports/apisports.server");
        const provider = createProvider();
        if (!provider)
          return Response.json({ ok: false, error: "sports_api_not_configured" }, { status: 503 });

        const { syncResults } = await import("@/lib/sports/sync.server");
        const { createFixtureStore } = await import("@/lib/sports/store.server");
        try {
          const report = await syncResults(provider, createFixtureStore());
          console.info("sync-results", JSON.stringify(report));
          return Response.json(report);
        } catch (error) {
          console.error("sync-results failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
