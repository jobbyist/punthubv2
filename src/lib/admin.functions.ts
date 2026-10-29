import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { csvProviderRef, parseFixtureCsv } from "@/lib/sports/csv";

export type ImportResult =
  | { ok: true; imported: number }
  | {
      ok: false;
      code: "forbidden" | "invalid" | "error";
      errors?: { line: number; message: string }[];
    };

/**
 * Admin-only fallback for fixtures the provider misses. The role is checked on the server through is_admin().
 * The whole file is rejected if any row is bad, so a partial import never happens by accident.
 */
export const importFixturesCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const csv =
      typeof input === "object" && input !== null ? (input as { csv?: unknown }).csv : undefined;
    if (typeof csv !== "string" || csv.length === 0 || csv.length > 200_000)
      throw new Error("invalid csv");
    return { csv };
  })
  .handler(async ({ data, context }): Promise<ImportResult> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) return { ok: false, code: "forbidden" };

    const parsed = parseFixtureCsv(data.csv);
    if (parsed.errors.length > 0 || parsed.rows.length === 0) {
      return { ok: false, code: "invalid", errors: parsed.errors };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("fixtures").upsert(
      parsed.rows.map((r) => ({
        provider: "csv",
        provider_ref: csvProviderRef(r),
        sport: r.sport,
        competition: r.competition,
        home: r.home,
        away: r.away,
        kickoff_at: r.kickoffAt,
      })),
      { onConflict: "provider,provider_ref", ignoreDuplicates: false },
    );
    if (error) {
      console.error("fixture csv import failed", error);
      return { ok: false, code: "error" };
    }
    return { ok: true, imported: parsed.rows.length };
  });
