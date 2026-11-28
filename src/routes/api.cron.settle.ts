import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/settle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const startedAt = Date.now();
        const errors: string[] = [];
        let picks: Record<string, unknown> = { ok: false, error: "not_run" };
        let duels: Record<string, unknown> = { ok: false, error: "not_run" };

        // Run both settlement paths independently. A pick-ledger failure must never prevent a duel
        // from settling, and a duel failure must never hold up ordinary predictions.
        try {
          const { runSettlement } = await import("@/lib/settle.server");
          const { createSettlementStore } = await import("@/lib/settlement-store.server");
          picks = await runSettlement(createSettlementStore());
        } catch (error) {
          errors.push("picks");
          console.error("pick settlement failed", error);
          picks = { ok: false, error: error instanceof Error ? error.message : "unknown_error" };
        }

        try {
          const { runDuelSettlement } = await import("@/lib/duels");
          const { createDuelSettleStore } = await import("@/lib/duels-store.server");
          duels = await runDuelSettlement(createDuelSettleStore());
        } catch (error) {
          errors.push("duels");
          console.error("duel settlement failed", error);
          duels = { ok: false, error: error instanceof Error ? error.message : "unknown_error" };
        }

        const report = {
          ok: errors.length === 0,
          picks,
          duels,
          durationMs: Date.now() - startedAt,
          errors,
        };
        console.info("settlement-cycle", JSON.stringify(report));
        return Response.json(report, { status: errors.length ? 500 : 200 });
      },
    },
  },
});
