import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Deletes slip images older than their 30-day expiry (Storage API) and clears the slip's image path. */
export const Route = createFileRoute("/api/cron/slip-images")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
        const { data, error } = await db
          .from("bet_slips")
          .select("id, image_path")
          .not("image_path", "is", null)
          .lt("image_expires_at", new Date().toISOString())
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        const rows = (data ?? []) as { id: string; image_path: string }[];
        if (rows.length === 0) return Response.json({ ok: true, removed: 0 });
        const { error: rmError } = await db.storage
          .from("slips")
          .remove(rows.map((r) => r.image_path));
        if (rmError) return Response.json({ ok: false, error: rmError.message }, { status: 500 });
        // Removing an already-deleted path is not an error, so a failed update here is retried safely next run.
        const { error: updError } = await db
          .from("bet_slips")
          .update({ image_path: null, image_expires_at: null })
          .in(
            "id",
            rows.map((r) => r.id),
          );
        if (updError) {
          return Response.json(
            { ok: false, removed: rows.length, error: updError.message },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, removed: rows.length });
      },
    },
  },
});
