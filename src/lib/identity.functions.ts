import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** New tables and functions are typed loosely until types.ts is regenerated. */
type Loose = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const BUCKET = "id-documents";

/** Member: register an uploaded document for review, and delete any document it replaces. */
export const submitIdentityDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ path: z.string().min(3).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as Loose;
    const { data: res, error } = await db.rpc("submit_identity_document", { p_path: data.path });
    if (error) return { ok: false as const, error: error.message };
    const { status, replaced } = (res ?? {}) as { status?: string; replaced?: string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (status === "approved") await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    else if (replaced && replaced !== data.path)
      await supabaseAdmin.storage.from(BUCKET).remove([replaced]);
    return { ok: true as const, status: status ?? "pending" };
  });

export type IdentityQueueItem = {
  user_id: string;
  username: string;
  display_name: string | null;
  birth_year: number | null;
  first_name: string | null;
  last_name: string | null;
  submitted_at: string;
  /** Signed URL, valid for 10 minutes. */
  url: string | null;
};

/** Admin: pending submissions with short-lived links to view each document. */
export const getIdentityQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IdentityQueueItem[]> => {
    const db = context.supabase as unknown as Loose;
    // The database checks is_admin(); a non-admin gets an error and nothing is signed.
    const { data, error } = await db.rpc("admin_identity_queue");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as (Omit<IdentityQueueItem, "url"> & {
      document_path: string | null;
    })[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return Promise.all(
      rows.map(async ({ document_path, ...r }) => {
        if (!document_path) return { ...r, url: null };
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(document_path, 600);
        return { ...r, url: signed?.signedUrl ?? null };
      }),
    );
  });

/** Admin: approve or reject. The document is deleted straight after the decision. */
export const reviewIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as Loose;
    const { data: path, error } = await db.rpc("admin_review_identity", {
      p_user: data.userId,
      p_approve: data.approve,
      p_reason: data.reason ?? null,
    });
    if (error) return { ok: false as const, error: error.message };
    if (typeof path === "string" && path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
      if (rmErr) console.error("id document delete failed", rmErr.message);
    }
    return { ok: true as const };
  });
