/**
 * Editorial quality gate. Deterministic TypeScript, no AI: the model writes, this file decides.
 *
 * An article is only eligible for automatic publishing when it has no critical issue and its score reaches the
 * configured minimum. Critical issues are the ones the brief calls non-negotiable: a fact that cannot be traced to
 * a source, an invented number or quotation, thin sourcing, a duplicate, or copy that breaks the house rules.
 */
import { z } from "zod";

import type {
  ArticleDraft,
  ContentKind,
  QualityIssue,
  QualityReport,
  ResearchSource,
} from "./types";

export const draftSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().min(1),
  body: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).default([]),
  seoTitle: z.string().trim().default(""),
  seoDescription: z.string().trim().default(""),
  claims: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        source: z.number().int(),
        quote: z.string().trim().min(1),
      }),
    )
    .default([]),
});

/** Parses the model's JSON answer. Returns null for anything that is not the expected shape. */
export function parseDraft(text: string): ArticleDraft | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = draftSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Lower case, straight quotes, plain hyphens, single spaces: so a copied quote still matches after clean-up. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[*_`#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** CLAUDE.md copy rules: never imply profit or certainty. */
const BANNED_PHRASES = [
  "guarantee",
  "sure bet",
  "sure thing",
  "sure win",
  "win money",
  "earn more",
  "value bet",
  "#1",
  "banker",
  "can't lose",
  "cannot lose",
  "risk-free",
  "risk free",
];

const CLICHES = [
  "in the world of",
  "delve",
  "in conclusion",
  "it's worth noting",
  "it is worth noting",
  "game-changer",
  "game changer",
  "buckle up",
  "the beautiful game",
  "only time will tell",
];

const PREDICTION_AS_FACT =
  /\bwill (?:definitely |certainly |surely )?(?:win|beat|lose|thrash|score|be relegated)\b/i;

function words(text: string): string[] {
  return normalise(text).match(/[a-z0-9']+/g) ?? [];
}

/** Share of words two titles have in common (Jaccard), ignoring very short words. */
export function titleSimilarity(a: string, b: string): number {
  const sa = new Set(words(a).filter((w) => w.length > 2));
  const sb = new Set(words(b).filter((w) => w.length > 2));
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const w of sa) if (sb.has(w)) shared++;
  return shared / (sa.size + sb.size - shared);
}

/** Numbers of two or more characters in the article: scores (2-1), dates, minutes, totals, percentages. */
export function numberTokens(text: string): string[] {
  const found = normalise(text).match(/\d+(?:[.,:\-/]\d+)*/g) ?? [];
  return [...new Set(found.filter((t) => t.length >= 2))];
}

/** Text inside double quotation marks that runs to four words or more: treated as a quotation of someone. */
export function quotedPassages(text: string): string[] {
  const out: string[] = [];
  for (const m of normalise(text).matchAll(/"([^"]{12,400})"/g)) {
    const passage = (m[1] ?? "").trim().replace(/[.,!?]$/, "");
    if (passage.split(" ").length >= 4) out.push(passage);
  }
  return out;
}

export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(words(body).length / 220));
}

/** Slug the newsroom accepts (`^[a-z0-9]+(-[a-z0-9]+)*$`), ending in the date so a repeat title cannot collide. */
export function slugFor(title: string, isoDate: string): string {
  const base = normalise(title)
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
  return `${base || "article"}-${isoDate}`;
}

export interface ValidateInput {
  draft: ArticleDraft;
  kind: ContentKind;
  sources: ResearchSource[];
  recentTitles: string[];
  /** Claims a second model could not find in the sources (independent review pass). Empty when not run. */
  reviewerUnsupported?: string[];
}

export function validateDraft(input: ValidateInput): QualityReport {
  const { draft, kind, sources } = input;
  const issues: QualityIssue[] = [];
  let score = 100;
  const critical = (code: string, detail: string) => issues.push({ code, critical: true, detail });
  const minor = (code: string, detail: string, cost: number) => {
    issues.push({ code, critical: false, detail });
    score -= cost;
  };

  const byIndex = new Map(sources.map((s) => [s.index, s]));
  const allSourceText = normalise(sources.map((s) => `${s.title} ${s.text}`).join(" \n "));
  const article = `${draft.title}\n${draft.excerpt}\n${draft.body}`;
  const articleNorm = normalise(article);

  // Structure.
  if (draft.title.length < 20 || draft.title.length > 110)
    critical("title_length", `title is ${draft.title.length} characters (20 to 110 allowed)`);
  if (draft.excerpt.length < 60 || draft.excerpt.length > 280)
    critical("excerpt_length", `excerpt is ${draft.excerpt.length} characters (60 to 280 allowed)`);
  const minBody = kind === "sports" ? 1_800 : 900;
  if (draft.body.length < minBody || draft.body.length > 9_000)
    critical(
      "body_length",
      `body is ${draft.body.length} characters (${minBody} to 9,000 allowed)`,
    );
  if (draft.body.split(/\n\s*\n/).filter((p) => p.trim()).length < 3)
    minor("few_paragraphs", "fewer than three paragraphs", 10);
  if (/<[a-z][^>]*>/i.test(draft.body))
    critical("html_in_body", "body contains HTML; the newsroom shows plain text");

  // House copy rules.
  for (const phrase of BANNED_PHRASES) {
    if (articleNorm.includes(phrase)) critical("banned_phrase", `uses "${phrase}"`);
  }
  if (PREDICTION_AS_FACT.test(article))
    minor("prediction_as_fact", "states a future result as certain", 15);
  for (const phrase of CLICHES) {
    if (articleNorm.includes(phrase)) minor("cliche", `uses "${phrase}"`, 5);
  }

  // Every claim must point at a real source and carry words that are really on that page.
  const minClaims = kind === "sports" ? 4 : 2;
  if (draft.claims.length < minClaims)
    critical("few_claims", `${draft.claims.length} sourced claims (at least ${minClaims} needed)`);
  const citedDomains = new Set<string>();
  for (const claim of draft.claims) {
    const source = byIndex.get(claim.source);
    if (!source) {
      critical("claim_unknown_source", `claim cites source ${claim.source}, which does not exist`);
      continue;
    }
    const quote = normalise(claim.quote);
    if (quote.length < 12) {
      critical(
        "claim_quote_too_short",
        `supporting quote for "${claim.text.slice(0, 60)}" is too short to check`,
      );
      continue;
    }
    if (!normalise(`${source.title} ${source.text}`).includes(quote)) {
      critical(
        "claim_not_in_source",
        `"${claim.quote.slice(0, 80)}" is not in source ${claim.source}`,
      );
      continue;
    }
    citedDomains.add(source.domain);
  }
  const minDomains = kind === "sports" ? 2 : 1;
  if (citedDomains.size < minDomains)
    critical(
      "thin_sourcing",
      `verified claims come from ${citedDomains.size} site(s) (at least ${minDomains} needed)`,
    );

  // Numbers and quotations in the article must exist somewhere in the research.
  for (const token of numberTokens(article)) {
    if (!allSourceText.includes(token))
      critical("number_not_in_sources", `"${token}" appears in no source`);
  }
  for (const passage of quotedPassages(article)) {
    if (!allSourceText.includes(passage))
      critical(
        "quotation_not_in_sources",
        `quotation "${passage.slice(0, 80)}" appears in no source`,
      );
  }

  for (const claim of input.reviewerUnsupported ?? []) {
    critical(
      "reviewer_unsupported",
      `independent review could not find support for: ${claim.slice(0, 120)}`,
    );
  }

  // Duplicates.
  for (const title of input.recentTitles) {
    if (titleSimilarity(draft.title, title) >= 0.6) {
      critical("duplicate_title", `too close to the existing article "${title}"`);
      break;
    }
  }

  // Metadata.
  if (draft.seoTitle.length === 0 || draft.seoTitle.length > 60)
    minor("seo_title", `SEO title is ${draft.seoTitle.length} characters (1 to 60)`, 5);
  if (draft.seoDescription.length < 70 || draft.seoDescription.length > 160)
    minor(
      "seo_description",
      `meta description is ${draft.seoDescription.length} characters (70 to 160)`,
      5,
    );
  if (draft.tags.length < 2 || draft.tags.length > 6)
    minor("tags", `${draft.tags.length} tags (2 to 6)`, 5);

  const isCritical = issues.some((i) => i.critical);
  return {
    score: Math.max(0, isCritical ? Math.min(score, 49) : score),
    issues,
    critical: isCritical,
  };
}
