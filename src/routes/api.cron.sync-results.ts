import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/sync-results")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const only = url.searchParams.get("only")?.split(",").filter(Boolean) as
          import("@/lib/sports/competitions").CompetitionKey[] | undefined;
        const priority = url.searchParams.get("priority") === "1";
        const force = (url.searchParams.get("force") === "1" || priority) && Boolean(only?.length || priority);
        try {
          const { createSportsProvider } = await import("@/lib/sports/select.server");
          const provider = await createSportsProvider();
          if (!provider)
            return Response.json({ ok: false, error: "sports_api_not_configured" }, { status: 503 });

          const { syncResults } = await import("@/lib/sports/sync.server");
          const { createFixtureStore } = await import("@/lib/sports/store.server");
          const report = await syncResults(provider, createFixtureStore(), new Date(), {
            ...(only?.length ? { only } : {}),
            ...(force ? { force: true } : {}),
            ...(priority ? { priority: true } : {}),
          });
          console.info("sync-results", JSON.stringify({ mode: priority ? "settlement-priority" : "standard", ...report }));
          return Response.json({ mode: priority ? "settlement-priority" : "standard", ...report });
        } catch (error) {
          console.error("sync-results failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
