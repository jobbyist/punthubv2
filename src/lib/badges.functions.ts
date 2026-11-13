/** Admin > Fixtures > Team badges: status per team, run the resolver, set or reject a badge by hand. */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { badgeKey, cleanManualLogoUrl } from "@/lib/badges/resolve";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; message: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function log(
  db: SupabaseClient,
  adminId: string,
  action: string,
  detail: Record<string, unknown>,
) {
  await db.from("admin_actions").insert({ admin_id: adminId, action, detail });
}

export interface BadgeRow {
  sport: string;
  name: string;
  competition: string;
  status: "verified" | "pending" | "failed" | "rejected" | "missing";
  logoUrl: string | null;
  sourcePage: string | null;
  method: string | null;
  attempts: number;
  lastError: string | null;
  checkedAt: string | null;
}

export const adminBadgeOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BadgeRow[] | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const { teamsInFixtures } = await import("@/lib/badges/resolve.server");
    const [teams, { data: rows }] = await Promise.all([
      teamsInFixtures(db),
      db.from("team_badges").select("*"),
    ]);
    const byKey = new Map(
      ((rows ?? []) as Record<string, unknown>[]).map((r) => [`${r["sport"]}:${r["team_key"]}`, r]),
    );
    const out: BadgeRow[] = teams.map((t) => {
      const r = byKey.get(`${t.sport}:${badgeKey(t.name)}`);
      byKey.delete(`${t.sport}:${badgeKey(t.name)}`);
      return {
        sport: t.sport,
        name: t.name,
        competition: t.competition,
        status: (r?.["status"] as BadgeRow["status"]) ?? "missing",
        logoUrl: (r?.["logo_url"] as string | null) ?? null,
        sourcePage: (r?.["source_page"] as string | null) ?? null,
        method: (r?.["method"] as string | null) ?? null,
        attempts: (r?.["attempts"] as number) ?? 0,
        lastError: (r?.["last_error"] as string | null) ?? null,
        checkedAt: (r?.["checked_at"] as string | null) ?? null,
      };
    });
    const order = { missing: 0, failed: 1, pending: 2, rejected: 3, verified: 4 };
    return out.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  });

export const adminRunBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false as const, message: "forbidden" };
    const { runBadgeJob } = await import("@/lib/badges/resolve.server");
    const r = await runBadgeJob(10, true);
    await log(db, ctx.userId, "badges.run", r);
    return { ok: true as const, ...r };
  });

const team = (o: Record<string, unknown>) => {
  const name = typeof o["name"] === "string" ? o["name"].trim().slice(0, 120) : "";
  const sport =
    typeof o["sport"] === "string" && /^[a-z]{3,20}$/.test(o["sport"]) ? o["sport"] : "soccer";
  const competition = typeof o["competition"] === "string" ? o["competition"].slice(0, 120) : "";
  if (!name) throw new Error("team required");
  return { name, sport, competition };
};

/** Sets a badge from an https image URL (mirrored to our storage). */
export const adminSetBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const url = cleanManualLogoUrl(o["url"]);
    if (!url) throw new Error("https image URL required");
    return { ...team(o), url };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; logoUrl: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, message: "forbidden" };
    try {
      const { setManualBadge } = await import("@/lib/badges/resolve.server");
      const logoUrl = await setManualBadge(data, data.url);
      await log(db, ctx.userId, "badges.manual", {
        team: data.name,
        sport: data.sport,
        source: data.url,
      });
      return { ok: true, logoUrl };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "failed" };
    }
  });

/** Rejects a wrong badge: the team goes back to unbadged (and its fixtures hidden) until a badge is set by hand. */
export const adminRejectBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => team((input ?? {}) as Record<string, unknown>))
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, message: "forbidden" };
    const { error } = await db.from("team_badges").upsert(
      {
        sport: data.sport,
        team_key: badgeKey(data.name),
        team_name: data.name,
        status: "rejected",
        logo_url: null,
        last_error: "rejected by an admin",
      },
      { onConflict: "sport,team_key" },
    );
    if (error) return { ok: false, message: error.message };
    await log(db, ctx.userId, "badges.reject", { team: data.name, sport: data.sport });
    return { ok: true };
  });
