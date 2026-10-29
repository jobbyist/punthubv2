import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/chain-head")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { sastDate } = await import("@/lib/sast");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const day = sastDate();
        const { data, error } = await supabaseAdmin.rpc("write_chain_head", { p_day: day });
        if (error) {
          console.error("chain-head failed", error);
          return Response.json({ ok: false, error: "chain_head_failed" }, { status: 500 });
        }
        const head = data?.[0] ?? null;
        console.info("chain-head", day, head ? `${head.head_pick_count} picks` : "no picks");
        return Response.json({
          ok: true,
          day,
          picks: head?.head_pick_count ?? 0,
          hash: head?.head_hash ?? null,
        });
      },
    },
  },
});
