import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReadinessSnapshot } from "@/lib/mvp-readiness";

/** /dev uses the existing Puntr Supabase admin session; there is no second credential gate. */
export type DevPageData =
  { status: "forbidden" } | { status: "open"; readiness: ReadinessSnapshot };

function privateHeaders() {
  setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  setResponseHeader("Cache-Control", "private, no-store");
}

export const getDevPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevPageData> => {
    privateHeaders();
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin");
    if (error || isAdmin !== true) return { status: "forbidden" };
    const { readSnapshot } = await import("@/lib/mvp-readiness.server");
    return { status: "open", readiness: await readSnapshot() };
  });

const taskSchema = z.object({
  taskId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  done: z.boolean(),
});

/** Ticks a readiness task. Re-checks the authenticated admin role for every write. */
export const setDevReadinessTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => taskSchema.parse(input))
  .handler(async ({ data, co¶»§q«^