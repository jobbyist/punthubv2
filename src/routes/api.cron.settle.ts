import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/settle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { runSettlement } = await import("@/lib/settle.server");
        const { createSettlementStore } = await import("@/lib/settlement-store.server");
        try {
          const report = await runSettlement(createSettlementStore());
          console.info("settle", JSON.stringify(report));
          // Duels settle on the same schedule, after picks, from the same final scores.
          const { runDuelSettlement } = await import("@/lib/duels");
          const { createDuelSettleStore } = await import("@/lib/duels-store.server");
          const duels = await runDuelSettlement(createDuelSettleStore()).catch((error: unknown) => {
            console.error("duel settle failed", error);
            return { error: "duel_settle_failed" };
          });
          console.info("settle-duels", JSON.stringify(duels));
          return Response.json({ ...report, duels });
        } catch (error) {
          console.error("settle failed", error);
          return Response.json({ ok: false, error: "settle_failed" }, { status: 500 });
        }
      },
    },
  },
});
