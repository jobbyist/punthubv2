import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveTeam } from "@/lib/pfie/teams";

import { coerceDraft, parseSlipText, type SlipDraft } from "./parse";
import { scrubSlipText } from "./scrub";

/** AI-assisted reads per member per day (text pastes and photos together). Deterministic parsing is unlimited. */
export const DAILY_PARSE_CAP = 20;

export type ParseSlipResult =
  | { ok: true; draft: SlipDraft; removed: number; usedAi: boolean; aiLeft: number }
  | { ok: false; error: "empty" | "daily_limit" | "unreadable" };

interface ParseInput {
  text: string;
  source: "text" | "image";
}

const SYSTEM = [
  "You read South African bookmaker betting slips (soccer). Return JSON only, following the schema.",
  "Copy team names, market names and selections exactly as written. Odds are decimal numbers.",
  "If a value is not on the slip, leave it out. Never invent a match, odds or an amount.",
  "Ignore anything that is not part of the bet (adverts, balances, menus).",
].join(" ");

const SCHEMA = {
  type: "object",
  properties: {
    bookmaker: { type: "string" },
    stake: { type: "number" },
    totalOdds: { type: "number" },
    potentialReturn: { type: "number" },
    legs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          home: { type: "string" },
          away: { type: "string" },
          competition: { type: "string" },
          market: { type: "string" },
          selection: { type: "string" },
          odds: { type: "number" },
        },
        required: ["home", "away"],
      },
    },
  },
  required: ["legs"],
};

/**
 * Reads slip text (pasted, or OCR'd on the member's device) into a draft for review. Text is scrubbed of personal
 * details again here; the deterministic parser runs first and Gemini is used only when it finds no legs, with the
 * scrubbed text only. Images never reach this function.
 */
export const parseSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): ParseInput => {
    const o = (input ?? {}) as Record<string, unknown>;
    const text = typeof o["text"] === "string" ? o["text"].slice(0, 20_000) : "";
    const source = o["source"] === "image" ? "image" : "text";
    return { text, source };
  })
  .handler(async ({ data, context }): Promise<ParseSlipResult> => {
    const { text, removed } = scrubSlipText(data.text);
    if (text.replace(/\[removed\]/g, "").trim().length < 5) return { ok: false, error: "empty" };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await db
      .from("slip_parses" as never)
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("ok", true)
      .gte("created_at", since);
    const used = count ?? 0;

    let draft = parseSlipText(text);
    let usedAi = false;
    if (!draft.legs.length) {
      if (used >= DAILY_PARSE_CAP) return { ok: false, error: "daily_limit" };
      draft = await readWithGemini(text);
      usedAi = true;
      await db.from("slip_parses" as never).insert({
        user_id: context.userId,
        source: data.source,
        chars: text.length,
        ok: draft.legs.length > 0,
      } as never);
      if (!draft.legs.length) return { ok: false, error: "unreadable" };
    }
    draft = await matchFixtures(db, draft);
    return {
      ok: true,
      draft,
      removed,
      usedAi,
      aiLeft: Math.max(0, DAILY_PARSE_CAP - used - (usedAi ? 1 : 0)),
    };
  });

async function readWithGemini(text: string): Promise<SlipDraft> {
  try {
    const { readContentEnv } = await import("@/lib/content/config");
    const env = readContentEnv();
    if (!env.geminiKey) return coerceDraft(null);
    const { createGemini } = await import("@/lib/content/providers.server");
    const { createModelRouter } = await import("@/lib/content/model-router");
    const { createQuotaClaim, guardLlm } = await import("@/lib/quota.server");
    const router = createModelRouter(
      guardLlm(createGemini(env.geminiKey), await createQuotaClaim()),
      {
        // Flash-Lite first: high allowance, simple extraction.
        models: [...env.models].sort(
          (a, b) => Number(b.includes("lite")) - Number(a.includes("lite")),
        ),
        dailyCap: env.dailyRequestCap,
      },
    );
    const r = await router.generate({
      system: SYSTEM,
      prompt: `Betting slip text:\n"""\n${text}\n"""`,
      schema: SCHEMA,
      temperature: 0,
      maxOutputTokens: 2048,
    });
    return coerceDraft(JSON.parse(r.text));
  } catch {
    return coerceDraft(null);
  }
}

type Db = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Links each leg to an upcoming Puntr fixture when both team names resolve to exactly one fixture. */
async function matchFixtures(db: Db, draft: SlipDraft): Promise<SlipDraft> {
  if (!draft.legs.length) return draft;
  const from = new Date(Date.now() - 3 * 3600_000).toISOString();
  const to = new Date(Date.now() + 14 * 86400_000).toISOString();
  const { data } = await db
    .from("fixtures")
    .select("id, home, away, competition, kickoff_at")
    .eq("status", "scheduled")
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .limit(1000);
  const fixtures = (data ?? []) as {
    id: string;
    home: string;
    away: string;
    competition: string;
  }[];
  const teams = [...new Set(fixtures.flatMap((f) => [f.home, f.away]))];
  return {
    ...draft,
    legs: draft.legs.map((leg) => {
      const h = resolveTeam(leg.home, teams);
      const a = resolveTeam(leg.away, teams);
      if (!h || !a || h === "ambiguous" || a === "ambiguous") return { ...leg, fixtureId: null };
      const hits = fixtures.filter((f) => f.home === h && f.away === a);
      if (hits.length !== 1) return { ...leg, fixtureId: null };
      const f = hits[0]!;
      return { ...leg, home: f.home, away: f.away, competition: f.competition, fixtureId: f.id };
    }),
  };
}
