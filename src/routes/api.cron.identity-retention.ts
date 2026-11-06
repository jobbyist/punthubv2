import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** Deletes ID documents that were never checked within 30 days (privacy notice promise). Daily. */
export const Route = createFileRoute("/api/cron/identity-retention")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as {
          rpc: (fn: string) => Promise<{
            data: { user_id: string; document_path: string }[] | null;
            error: { message: string } | null;
          }>;
          from: (t: string) => {
            update: (v: Record<string, unknown>) => {
              eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
        const { data, error } = await db.rpc("identity_expired_documents");
        if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
        let removed = 0;
        for (const r of data ?? []) {
          const { error: rmErr } = await supabaseAdmin.storage
            .from("id-documents")
            .remove([r.document_path]);
          if (rmErr) {
            console.error("identity-retention remove failed", rmErr.message);
            continue;
          }
          await db
            .from("identity_verifications")
            .update({
              status: "rejected",
              document_path: null,
              reject_reason: "Your document wasn't checked within 30 days, so we deleted it.",
              reviewed_at: new Date().toISOString(),
            })
            .eq("user_id", r.user_id);
          removed += 1;
        }
        return Response.json({ ok: true, removed });
      },
    },
  },
});
