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
          return Response.json(report);
        } catch (error) {
          console.error("settle failed", error);
          return Response.json({ ok: false, error: "settle_failed" }, { status: 500 });
        }
      },
    },
  },
});
