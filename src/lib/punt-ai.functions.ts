import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_PFIE_MODELS, parseModelList, readContentEnv } from "@/lib/content/config";
import { createGemini, createParallelExtract, createParallelResponses, createParallelSearch } from "@/lib/content/providers.server";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { cleanText, domainOf } from "@/lib/content/research";
import { createQuotaClaim, guardExtract, guardLlm, guardSearch } from "@/lib/quota.server";
import { createCacheStore } from "@/lib/parallel/cache.server";
import { withExtractCache, withSearchCache } from "@/lib/parallel/cached";
import { STANDINGS_LAUNCH_KEYS } from "@/lib/pfie/standings";
import {
  containsPuntAiPrivateContext,
  isPuntAiOddsQuestion,
  needsPuntAiLiveWeb,
  normalizePuntAiQuestion,
  PUNT_AI_LIVE_CREDIT_COST,
  PUNT_AI_MAX_MESSAGE_CHARS,
  scrubPuntAiMessage,
} from "@/lib/punt-ai.logic";

type AiSource = { title: string; url: string; domain?: string };
type AiMode = "internal" | "live_web";
type AskPuntAiResult =
  | {
      ok: true;
      answer: string;
      sources: AiSource[];
      mode: AiMode;
      model: string;
      notice?: string;
      creditsCharged: number;
      balance: number | null;
    }
  | { ok: false; code: "not_launched" | "rate_limited" | "unavailable" };

type ContextBundle = { text: string; sources: AiSource[] };

const ANSWER_SCHEMA = {
  type: "OBJECT",
  properties: { answer: { type: "STRING" } },
  required: ["answer"],
};

const SYSTEM_PROMPT = `You are PUNT AI, Puntr's South African sports intelligence assistant.
Use clear South African English. Answer from the supplied verified Puntr data and, when provided, the supplied live source extracts.
Never invent fixtures, results, scores, injuries, suspensions, line-ups, standings, bookmaker prices or source citations.
Clearly distinguish current external reporting from Puntr's stored data and state when the evidence is missing or stale.
Never promise a winning bet, describe any pick as guaranteed, or tell a user how much money to stake.
Do not encourage chasing losses. Keep responsible-gambling guidance factual and non-judgemental. Puntr is for adults aged 18+.
If the question is about how Puntr works, use this product context: picks lock at kick-off and are settled against verified results; odds a member enters are user-submitted and are not represented as live or independently verified prices; units are standardised stake measures rather than currency; ROI expresses net units as a percentage of total units risked.
If a calculation is requested, show the formula and only calculate from figures in the supplied context.`;

const LIVE_TRUSTED_DOMAINS = [
  "premierleague.com",
  "uefa.com",
  "bundesliga.com",
  "laliga.com",
  "legaseriea.it",
  "ligue1.com",
  "cafonline.com",
  "psl.co.za",
  "safa.net",
  "bbc.com",
  "reuters.com",
  "apnews.com",
  "espn.com",
  "skysports.com",
  "supersport.com",
  "theguardian.com",
  "goal.com",
  "flashscore.com",
  "365scores.com",
  "soccerway.com",
] as const;

const MAX_LIVE_SOURCES = 3;
const CACHE_TTL_MS = 60 * 60 * 1000;

function isTrustedLiveDomain(domain: string): boolean {
  const host = domain.toLowerCase();
  return LIVE_TRUSTED_DOMAINS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseAnswer(text: string): string {
  try {
    const parsed = JSON.parse(text) as { answer?: unknown };
    if (typeof parsed.answer === "string" && parsed.answer.trim()) return parsed.answer.trim();
  } catch {
    const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      const parsed = JSON.parse(unfenced) as { answer?: unknown };
      if (typeof parsed.answer === "string" && parsed.answer.trim()) return parsed.answer.trim();
    } catch {
      // Fall through to the raw answer; the model's response is still useful if JSON framing was lost.
    }
  }
  return text.trim();
}

async function loadPuntrContext(db: SupabaseClient, now: Date): Promise<ContextBundle> {
  const from = now.toISOString();
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const [fixturesResult, standingsResult, articlesResult] = await Promise.all([
    db
      .from("fixtures")
      .select("competition, home, away, kickoff_at")
      .eq("sport", "soccer")
      .eq("status", "scheduled")
      .gte("kickoff_at", from)
      .lt("kickoff_at", to)
      .order("kickoff_at", { ascending: true })
      .limit(24),
    db
      .from("league_standings")
      .select("competition_key, competition, group_name, team, position, played, won, drawn, lost, goals_for, goals_against, points, synced_at")
      .in("competition_key", [...STANDINGS_LAUNCH_KEYS])
      .order("competition_key")
      .order("group_name")
      .order("position")
      .limit(100),
    db
      .from("newsroom_articles")
      .select("title, excerpt, category, published_at")
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(6),
  ]);

  if (fixturesResult.error) throw new Error(`Puntr fixture context unavailable: ${fixturesResult.error.message}`);
  if (standingsResult.error) throw new Error(`Puntr standings context unavailable: ${standingsResult.error.message}`);
  if (articlesResult.error) throw new Error(`Puntr newsroom context unavailable: ${articlesResult.error.message}`);

  const fixtures = (fixturesResult.data ?? []) as Record<string, unknown>[];
  const standings = (standingsResult.data ?? []) as Record<string, unknown>[];
  const articles = (articlesResult.data ?? []) as Record<string, unknown>[];

  const sections = [
    `Context timestamp: ${now.toISOString()}.`,
    "UPCOMING VERIFIED FIXTURES (next seven days):",
    fixtures.length
      ? fixtures.map((f) => `- ${f["competition"]}: ${f["home"]} vs ${f["away"]}, kick-off ${f["kickoff_at"]}.`).join("\n")
      : "No upcoming fixtures are currently available in Puntr's verified fixture store.",
    "LATEST STORED LEAGUE STANDINGS:",
    standings.length
      ? standings.map((r) => {
          const group = typeof r["group_name"] === "string" && r["group_name"] ? ` Group ${r["group_name"]}` : "";
          return `- ${r["competition"]}${group}: #${r["position"]} ${r["team"]}; P${r["played"]} W${r["won"]} D${r["drawn"]} L${r["lost"]} GF${r["goals_for"]} GA${r["goals_against"]} Pts ${r["points"]}; synced ${r["synced_at"]}.`;
        }).join("\n")
      : "No verified standings are currently stored for the launch competitions.",
    "RECENT PUBLISHED PUNTR NEWSROOM ITEMS:",
    articles.length
      ? articles.map((a) => `- ${a["title"]} (${a["category"]}, ${a["published_at"]}): ${a["excerpt"]}`).join("\n")
      : "No published Newsroom items are currently available.",
  ];

  const sources: AiSource[] = [];
  if (fixtures.length) sources.push({ title: "Puntr fixtures", url: "/fixtures" });
  if (standings.length) sources.push({ title: "Puntr league tables", url: "/tables" });
  if (articles.length) sources.push({ title: "Puntr Newsroom", url: "/newsroom" });
  return { text: sections.join("\n\n").slice(0, 14_000), sources };
}

async function generateInternalAnswer(
  safeMessage: string,
  context: ContextBundle,
  env: NodeJS.ProcessEnv,
): Promise<{ answer: string; model: string }> {
  if (!env["GEMINI_API_KEY"]?.trim()) throw new Error("Gemini is not configured for internal-data answers.");
  const claim = await createQuotaClaim("punt-ai:internal");
  const provider = guardLlm(createGemini(env["GEMINI_API_KEY"]!.trim()), claim);
  const configured = parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(","));
  const models = configured.models.filter((model) => model.startsWith("gemini-"));
  const router = createModelRouter(provider, { models });
  const result = await router.generate({
    system: SYSTEM_PROMPT + "\nAnswer strictly from the supplied Puntr context and product context. If the answer is not in that context, say what is missing.",
    prompt: `MEMBER QUESTION:\n${safeMessage}\n\nPUNTR VERIFIED DATA:\n${context.text}\n\nReturn a concise answer. Do not invent external facts.`,
    schema: ANSWER_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 900,
  });
  return { answer: parseAnswer(result.text), model: result.model };
}

async function generateLiveAnswer(
  safeMessage: string,
  context: ContextBundle,
  parallelKey: string,
): Promise<{ answer: string; model: string; sources: AiSource[] } | null> {
  const claim = await createQuotaClaim("punt-ai:live-web");
  const cache = await createCacheStore();
  const search = withSearchCache(
    guardSearch(createParallelSearch(parallelKey), claim),
    cache,
    "chat",
  );
  const hits = await search.search({
    objective: `Find current, reputable sources to answer this sports question. Prefer official competition, club and federation sources, then established sports news publishers. Do not use bookmaker odds pages, forums, social posts or user-generated sources. Question: ${safeMessage}`,
    queries: [safeMessage],
    maxResults: 12,
  });
  const candidates = hits
    .filter((hit) => /^https:\/\//i.test(hit.url) && isTrustedLiveDomain(domainOf(hit.url)))
    .filter((hit, index, all) => all.findIndex((other) => domainOf(other.url) === domainOf(hit.url)) === index)
    .slice(0, MAX_LIVE_SOURCES);
  if (!candidates.length) return null;

  const extract = withExtractCache(
    guardExtract(createParallelExtract(parallelKey, {}, { maxAgeSeconds: 3_600 }), claim),
    cache,
    "chat",
  );
  if (!extract) return null;
  const pages = await Promise.all(candidates.map(async (hit) => {
    const page = await extract.extract(hit.url).catch(() => null);
    if (!page?.markdown) return null;
    return {
      title: page.title || hit.title || domainOf(hit.url),
      url: hit.url,
      domain: domainOf(hit.url),
      text: cleanText(page.markdown, 4_500),
    };
  }));
  const sources = pages.filter((page): page is NonNullable<typeof page> => Boolean(page?.text));
  if (!sources.length) return null;

  const sourceText = sources.map((source, index) =>
    `[${index + 1}] ${source.title} — ${source.domain}\nURL: ${source.url}\n${source.text}`,
  ).join("\n\n");
  const answer = await guardLlm(
    createParallelResponses(parallelKey, {}, { effort: "low" }),
    claim,
  ).generate("parallel-low", {
    system: SYSTEM_PROMPT + "\nUse the live source extracts and Puntr context. Cite live source references as [1], [2] etc. Never cite a source that was not supplied.",
    prompt: `MEMBER QUESTION:\n${safeMessage}\n\nPUNTR VERIFIED DATA:\n${context.text}\n\nLIVE SOURCES:\n${sourceText}\n\nAnswer the question using the strongest available evidence. If sources disagree or do not answer it, say so.`,
    schema: ANSWER_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 900,
  });
  return {
    answer: parseAnswer(answer.text),
    model: answer.model,
    sources: sources.map(({ title, url, domain }) => ({ title, url, domain })),
  };
}

async function writeCache(
  db: SupabaseClient,
  cacheKey: string,
  mode: AiMode,
  answer: string,
  sources: AiSource[],
  model: string,
  now: Date,
) {
  const { error } = await db.from("punt_ai_cache").upsert({
    cache_key: cacheKey,
    mode,
    answer,
    sources,
    model,
    expires_at: new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
  }, { onConflict: "cache_key" });
  if (error) console.warn("PUNT AI cache write failed", error.message);
}

export const askPuntAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ message: z.string().trim().min(1).max(PUNT_AI_MAX_MESSAGE_CHARS) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<AskPuntAiResult> => {
    const { data: launched, error: launchError } = await context.supabase.rpc("mvp_open");
    if (launchError || launched !== true) return { ok: false, code: "not_launched" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("account_type, is_ai_participant, is_banned")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError || !profile || profile.is_banned || profile.is_ai_participant) {
      return { ok: false, code: "unavailable" };
    }

    const normalized = normalizePuntAiQuestion(data.message);
    const safeMessage = scrubPuntAiMessage(data.message);
    const oddsQuestion = isPuntAiOddsQuestion(data.message);
    const privateContext = containsPuntAiPrivateContext(data.message);
    const liveRequested = needsPuntAiLiveWeb(data.message) && !oddsQuestion && !privateContext;

    let mode: AiMode = "internal";
    let notice: string | undefined;
    let balance: number | null = null;
    if (oddsQuestion) {
      notice = "Automated bookmaker prices are not available in PUNT AI while data-use permissions are being finalised. I can explain the market or discuss odds you enter yourself.";
    } else if (privateContext) {
      notice = "Personal account or contact details are not sent to live web providers. This answer uses Puntr's stored data only.";
    }
    if (liveRequested) {
      const [entitlement, balanceResult] = await Promise.all([
        context.supabase.rpc("has_entitlement", { p_user: context.userId, p_entitlement: "pro" }),
        context.supabase.rpc("credit_balance", { p_user: context.userId }),
      ]);
      balance = typeof balanceResult.data === "number" ? balanceResult.data : 0;
      const pro = entitlement.data === true || profile.account_type === "pro";
      if (pro || balance >= PUNT_AI_LIVE_CREDIT_COST) mode = "live_web";
      else notice = "Live web answers require Pro or 2 credits. This answer uses Puntr's stored data only.";
    }

    const cacheKey = `punt-ai:v1:${mode}:${await sha256(normalized)}`;
    const { data: usageId, error: usageError } = await db.rpc("punt_ai_claim", {
      p_user: context.userId,
      p_mode: mode,
      p_cache_key: cacheKey,
    });
    if (usageError || !usageId) return { ok: false, code: "rate_limited" };

    const now = new Date();
    const { data: cached } = await db
      .from("punt_ai_cache")
      .select("answer, sources, model, mode")
      .eq("cache_key", cacheKey)
      .gt("expires_at", now.toISOString())
      .maybeSingle();

    const markUsage = async (values: Record<string, unknown>) => {
      const { error } = await db.from("punt_ai_usage").update({ ...values, updated_at: new Date().toISOString() }).eq("id", usageId);
      if (error) console.warn("PUNT AI usage update failed", error.message);
    };

    const spendLiveCredit = async (): Promise<{ charged: number; balance: number | null } | null> => {
      const ref = `punt-ai:${await sha256(normalized)}:${Math.floor(now.getTime() / CACHE_TTL_MS)}`;
      const { data, error } = await context.supabase.rpc("spend_credits", {
        p_feature: "punt_ai_live",
        p_ref: ref,
      });
      if (error || !data || typeof data !== "object") return null;
      const value = data as Record<string, unknown>;
      return {
        charged: Number(value["charged"] ?? 0),
        balance: typeof value["balance"] === "number" ? value["balance"] : null,
      };
    };

    if (cached) {
      let charged = { charged: 0, balance };
      if (mode === "live_web") {
        const result = await spendLiveCredit();
        if (!result) {
          await markUsage({ mode: "internal", status: "failed", cache_hit: true });
          mode = "internal";
          notice = "Live web access could not be charged to your account, so I couldn't return a live-web answer.";
        } else charged = result;
      } else {
        await markUsage({ status: "completed", cache_hit: true });
        return {
          ok: true,
          answer: String(cached.answer),
          sources: (cached.sources ?? []) as AiSource[],
          mode,
          model: String(cached.model),
          ...(notice ? { notice } : {}),
          creditsCharged: 0,
          balance,
        };
      }
      if (mode === "live_web") {
        await markUsage({ status: "completed", cache_hit: true, credits_charged: charged.charged });
        return {
          ok: true,
          answer: String(cached.answer),
          sources: (cached.sources ?? []) as AiSource[],
          mode,
          model: String(cached.model),
          creditsCharged: charged.charged,
          balance: charged.balance,
        };
      }
    }

    try {
      const env = process.env;
      const contextBundle = await loadPuntrContext(db, now);
      let generated: { answer: string; model: string; sources: AiSource[] };
      if (mode === "live_web" && env["PARALLEL_API_KEY"]?.trim()) {
        const live = await generateLiveAnswer(safeMessage, contextBundle, env["PARALLEL_API_KEY"]!.trim());
        if (live) {
          const charged = await spendLiveCredit();
          if (charged) {
            generated = live;
            await writeCache(db, cacheKey, mode, generated.answer, generated.sources, generated.model, now);
            await markUsage({ status: "completed", cache_hit: false, credits_charged: charged.charged });
            return {
              ok: true,
              answer: generated.answer,
              sources: generated.sources,
              mode,
              model: generated.model,
              creditsCharged: charged.charged,
              balance: charged.balance,
            };
          }
        }
        notice = "Live sources or account credit were unavailable, so this answer uses Puntr's stored data only.";
        mode = "internal";
      } else if (mode === "live_web") {
        notice = "Live web is temporarily unavailable. This answer uses Puntr's stored data only.";
        mode = "internal";
      }

      const internalCacheKey = `punt-ai:v1:internal:${await sha256(normalized)}`;
      const internalCached = cacheKey === internalCacheKey ? cached : (await db
        .from("punt_ai_cache")
        .select("answer, sources, model")
        .eq("cache_key", internalCacheKey)
        .gt("expires_at", now.toISOString())
        .maybeSingle()).data;
      if (internalCached) {
        generated = {
          answer: String(internalCached.answer),
          model: String(internalCached.model),
          sources: (internalCached.sources ?? []) as AiSource[],
        };
        await markUsage({ mode: "internal", status: "completed", cache_hit: true });
        return {
          ok: true,
          ...generated,
          mode: "internal",
          ...(notice ? { notice } : {}),
          creditsCharged: 0,
          balance,
        };
      }

      const internal = await generateInternalAnswer(safeMessage, contextBundle, env);
      generated = { ...internal, sources: contextBundle.sources };
      await writeCache(db, internalCacheKey, "internal", generated.answer, generated.sources, generated.model, now);
      await markUsage({ mode: "internal", status: "completed", cache_hit: false });
      return {
        ok: true,
        ...generated,
        mode: "internal",
        ...(notice ? { notice } : {}),
        creditsCharged: 0,
        balance,
      };
    } catch (error) {
      await markUsage({ status: "failed" });
      if (error instanceof AllModelsFailed) console.warn("PUNT AI Gemini models exhausted", error.attempts);
      else console.error("PUNT AI request failed", error);
      return { ok: false, code: "unavailable" };
    }
  });
