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

// ---------------------------------------------------------------------------------------------------------
// Admin actions the database cannot enforce by itself. The role is re-checked on the server every time with
// is_admin(), which reads the signed-in user's own profile, so a changed browser state grants nothing.
// ---------------------------------------------------------------------------------------------------------

type Ctx = { supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: boolean | null }> } };

async function isAdmin(context: Ctx): Promise<boolean> {
  const { data } = await context.supabase.rpc("is_admin");
  return data === true;
}

const uuid = (v: unknown) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("invalid id");
  return v;
};

export type AdminResult = { ok: true } | { ok: false; code: "forbidden" | "invalid" | "error" };

/** Ban or unban a member. You cannot change your own ban or an admin's. */
export const adminSetBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = (typeof input === "object" && input !== null ? input : {}) as {
      userId?: unknown;
      banned?: unknown;
    };
    if (typeof o.banned !== "boolean") throw new Error("invalid");
    return { userId: uuid(o.userId), banned: o.banned };
  })
  .handler(async ({ data, context }): Promise<AdminResult> => {
    if (!(await isAdmin(context))) return { ok: false, code: "forbidden" };
    if (data.userId === context.userId) return { ok: false, code: "invalid" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target || target.role === "admin") return { ok: false, code: "invalid" };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_banned: data.banned })
      .eq("id", data.userId);
    if (error) {
      console.error("ban update failed", error);
      return { ok: false, code: "error" };
    }
    return { ok: true };
  });

export interface SettlementOverview {
  totalPending: number;
  fixtures: {
    fixtureId: string;
    label: string;
    status: string;
    score: string | null;
    pending: number;
    /** False when the fixture is final but has no score yet: it cannot be graded automatically. */
    settleable: boolean;
  }[];
}

/** Final fixtures that still have picks waiting for a first settlement. */
export const adminSettlementOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettlementOverview | null> => {
    if (!(await isAdmin(context))) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending, error } = await supabaseAdmin.rpc("pending_settlements");
    if (error) throw error;
    const ids = (pending ?? []).map((p) => p.prediction_id);
    if (ids.length === 0) return { totalPending: 0, fixtures: [] };
    const { data: preds } = await supabaseAdmin
      .from("predictions")
      .select("id, fixture_id")
      .in("id", ids.slice(0, 500));
    const fixtureIds = [...new Set((preds ?? []).map((p) => p.fixture_id))];
    const { data: fixtures } = await supabaseAdmin
      .from("fixtures")
      .select("id, home, away, status, home_score, away_score")
      .in("id", fixtureIds);
    const byFixture = new Map<string, number>();
    for (const p of preds ?? [])
      byFixture.set(p.fixture_id, (byFixture.get(p.fixture_id) ?? 0) + 1);
    return {
      totalPending: ids.length,
      fixtures: (fixtures ?? []).map((f) => ({
        fixtureId: f.id,
        label: `${f.home} v ${f.away}`,
        status: f.status,
        score:
          f.home_score !== null && f.away_score !== null
            ? `${f.home_score} - ${f.away_score}`
            : null,
        pending: byFixture.get(f.id) ?? 0,
        settleable: f.status !== "finished" || (f.home_score !== null && f.away_score !== null),
      })),
    };
  });

/** Runs the same settlement the cron runs, on demand. */
export const adminSettleAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      | { ok: true; graded: number; inserted: number; skipped: number }
      | { ok: false; code: "forbidden" | "error" }
    > => {
      if (!(await isAdmin(context))) return { ok: false, code: "forbidden" };
      try {
        const { runSettlement } = await import("@/lib/settle.server");
        const { createSettlementStore } = await import("@/lib/settlement-store.server");
        const r = await runSettlement(createSettlementStore());
        return { ok: true, graded: r.graded, inserted: r.inserted, skipped: r.skipped };
      } catch (error) {
        console.error("admin settle failed", error);
        return { ok: false, code: "error" };
      }
    },
  );

/** Runs the fixture and result syncs on demand. Uses provider calls from the daily quota. */
export const adminResync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<
      | {
          ok: true;
          fixtures: { calls: number; upserted: number };
          results: { calls: number; upserted: number };
          skipped: string[];
        }
      | { ok: false; code: "forbidden" | "not_configured" | "error" }
    > => {
      if (!(await isAdmin(context))) return { ok: false, code: "forbidden" };
      try {
        const { createProvider } = await import("@/lib/sports/apisports.server");
        const provider = createProvider();
        if (!provider) return { ok: false, code: "not_configured" };
        const { syncFixtures, syncResults } = await import("@/lib/sports/sync.server");
        const { createFixtureStore } = await import("@/lib/sports/store.server");
        const store = createFixtureStore();
        const f = await syncFixtures(provider, store);
        const r = await syncResults(provider, store);
        return {
          ok: true,
          fixtures: { calls: f.calls, upserted: f.upserted },
          results: { calls: r.calls, upserted: r.upserted },
          skipped: [...f.skipped, ...r.skipped].map((s) => `${s.key}: ${s.reason}`),
        };
      } catch (error) {
        console.error("admin resync failed", error);
        return { ok: false, code: "error" };
      }
    },
  );

export interface AdminUserRow {
  id: string;
  username: string;
  role: string;
  isBanned: boolean;
  foundingNumber: number | null;
  createdAt: string;
}

/** Finds members by username. Profiles are private to their owner, so this reads them with the service role. */
export const adminFindUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const q = (input as { query?: unknown } | null)?.query;
    return {
      query:
        typeof q === "string"
          ? q
              .trim()
              .slice(0, 40)
              .replace(/[%_,()]/g, "")
          : "",
    };
  })
  .handler(async ({ data, context }): Promise<AdminUserRow[] | null> => {
    if (!(await isAdmin(context))) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, username, role, is_banned, founding_number, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (data.query) q = q.ilike("username", `%${data.query}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      role: r.role,
      isBanned: r.is_banned,
      foundingNumber: r.founding_number,
      createdAt: r.created_at,
    }));
  });

export interface LaunchStatus {
  /** True when LAUNCH_EMAILS_ENABLED=true on the server. Nothing is sent while it is off. */
  enabled: boolean;
  /** True when the email service is configured on the server. */
  emailConfigured: boolean;
  launchDate: string;
  waves: { wave: number; date: string; sent: number; failed: number }[];
}

/** Where the launch email waves stand. Reads server settings, so it runs on the server. */
export const adminLaunchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LaunchStatus | null> => {
    if (!(await isAdmin(context))) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { launchDate, waveDates } = await import("@/lib/launch");
    const launch = launchDate(process.env["LAUNCH_DATE"]);
    const { data } = await supabaseAdmin.from("launch_email_sends").select("wave, status");
    return {
      enabled: process.env["LAUNCH_EMAILS_ENABLED"] === "true",
      emailConfigured: Boolean(process.env["LOVABLE_API_KEY"] && process.env["RESEND_API_KEY"]),
      launchDate: launch,
      waves: waveDates(launch).map(({ wave, date }) => ({
        wave,
        date,
        sent: (data ?? []).filter((r) => r.wave === wave && r.status === "sent").length,
        failed: (data ?? []).filter((r) => r.wave === wave && r.status === "failed").length,
      })),
    };
  });
