/** Research stage: the brief, source ranking and de-duplication. Pure functions, no network. */
import { sastDate } from "@/lib/sast";

import type { ContentSlot, ProjectUpdate, ResearchSource, SearchHit } from "./types";

export interface ResearchBrief {
  objective: string;
  queries: string[];
}

/** Rotating football beats, so consecutive sports days do not chase the same story. Football only at launch. */
const SPORTS_BEATS: { label: string; queries: string[] }[] = [
  {
    label: "Betway Premiership",
    queries: ["Betway Premiership latest results and fixtures", "PSL news this week"],
  },
  {
    label: "English Premier League",
    queries: ["Premier League latest results and fixtures", "Premier League team news this week"],
  },
  {
    label: "UEFA Champions League",
    queries: ["Champions League latest results and fixtures", "Champions League matchday preview"],
  },
  {
    label: "South African football",
    queries: ["Bafana Bafana news", "South African football news this week"],
  },
];

export function sportsBrief(
  dayNumber: number,
  now: Date = new Date(),
  slot?: ContentSlot,
): ResearchBrief & { beat: string } {
  const beat = SPORTS_BEATS[Math.abs(dayNumber) % SPORTS_BEATS.length] ?? SPORTS_BEATS[0]!;
  const angles: Record<ContentSlot, { label: string; objective: string; queries: string[] }> = {
    breaking: {
      label: "Breaking News",
      objective: "Find the most important verified football developments published within the last 24 hours for South African fans. Prioritise official league, club and federation announcements, confirmed results, suspensions, injuries, transfers and fixture changes. Prefer individual, dated article pages from official and established publishers; avoid generic homepages, index pages and team profiles. Return only genuinely current stories and distinguish confirmed facts from reports.",
      queries: [`South African football confirmed news ${sastDate(now)}`, `site:psl.co.za/news football ${sastDate(now)}`, `site:supersport.com/football South African football news ${sastDate(now)}`, `Premier League official football news ${sastDate(now)}`],
    },
    editorial: {
      label: "Editorial Analysis",
      objective: "Find a substantive football issue with enough recent evidence for an original editorial analysis for South African readers. Seek multiple credible perspectives, relevant match or season context, tactical evidence and data. Prefer individual article pages over generic indexes. Avoid recycled opinion columns and unsupported speculation.",
      queries: [`site:psl.co.za/news Betway Premiership tactical analysis ${sastDate(now)}`, `South African football tactical analysis recent matches statistics ${sastDate(now)}`, `Premier League tactical analysis latest match data ${sastDate(now)}`],
    },
    intelligence: {
      label: "Sports Intelligence",
      objective: "Research a data-led football intelligence angle for South African fans: form, tactical patterns, team performance, competition context and upcoming fixtures. Prioritise official competition statistics and established sports data reporting, including relevant stats and fixture pages. Every statistic must be attributable to a source.",
      queries: [`Betway Premiership team statistics form standings ${sastDate(now)}`, `South African football player and team statistics ${sastDate(now)}`, `Premier League team performance statistics latest ${sastDate(now)}`],
    },
  };
  const angle = slot ? angles[slot] : null;
  return {
    beat: angle ? `${angle.label}: ${beat.label}` : beat.label,
    objective: angle
      ? `${angle.objective} Focus on ${beat.label}. Current date: ${sastDate(now)}.`
      : `Football news for South African fans about the ${beat.label}, as of ${sastDate(now)}: confirmed results, upcoming fixtures with dates, league position and form. Prefer the league's and clubs' official sites and established sports news desks. Ignore betting tips, odds and bookmaker promotions.`,
    queries: angle ? [...angle.queries, ...beat.queries] : beat.queries,
  };
}

/** Sources we trust first. Order matters only inside the same tier. */
const PREFERRED_DOMAINS = [
  "psl.co.za",
  "safa.net",
  "premierleague.com",
  "uefa.com",
  "fifa.com",
  "cafonline.com",
  "supersport.com",
  "bbc.com",
  "bbc.co.uk",
  "reuters.com",
  "apnews.com",
  "theguardian.com",
  "skysports.com",
  "espn.com",
  "kickoff.com",
  "soccerladuma.co.za",
  "timeslive.co.za",
  "news24.com",
  "iol.co.za",
  "sabcsport.com",
  "goal.com",
];

/** Never used as a source: bookmakers, tipster and odds pages, social networks, user-edited pages. */
const BLOCKED_PATTERNS = [
  /bet/i,
  /odds/i,
  /tips?\b/i,
  /casino/i,
  /predict/i,
  /(^|\.)(x|twitter|facebook|instagram|tiktok|reddit|youtube|wikipedia)\.(com|org)$/i,
];

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isBlockedDomain(domain: string): boolean {
  return domain === "" || BLOCKED_PATTERNS.some((p) => p.test(domain));
}

export function domainRank(domain: string): number {
  const i = PREFERRED_DOMAINS.findIndex((d) => domain === d || domain.endsWith(`.${d}`));
  return i === -1 ? PREFERRED_DOMAINS.length : i;
}

/** Strips tracking parameters and fragments so the same page is not counted twice. */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|src$)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Drops blocked and duplicate pages, keeps at most two pages per site, best sources first. */
function pageRank(hit: SearchHit, slot?: ContentSlot): number {
  let path = "/";
  try {
    path = new URL(hit.url).pathname.toLowerCase().replace(/\\/+$/, "") || "/";
  } catch {
    return 9;
  }
  let score = 0;
  if (path === "/") score += 8;
  if (/^\\/(news|latest|football|sport|fixtures|results|tournament|data|stats|teams|clubs|competition|leagues?)$/.test(path)) score += 5;
  if (/\\/(data|stats|standings|table|fixtures|results|teams|clubs|tournament|competition)(\\/|$)/.test(path)) {
    score += slot === "intelligence" ? -2 : 4;
  }
  if (!hit.publishedAt) score += 1;
  if (hit.title.trim().length < 18) score += 2;
  return score;
}

export function rankHits(hits: SearchHit[], limit: number, slot?: ContentSlot): SearchHit[] {
  const seen = new Set<string>();
  const perDomain = new Map<string, number>();
  const kept: (SearchHit & { rank: number; order: number })[] = [];
  hits.forEach((hit, order) => {
    const url = canonicalUrl(hit.url);
    const domain = domainOf(url);
    if (isBlockedDomain(domain) || seen.has(url)) return;
    seen.add(url);
    // Prefer individual, dated articles; keep stats/fixture pages higher for intelligence work.
    kept.push({ ...hit, url, rank: pageRank({ ...hit, url }, slot) * 100 + domainRank(domain), order });
  });
  kept.sort((a, b) => a.rank - b.rank || a.order - b.order);
  const out: SearchHit[] = [];
  for (const { rank: _rank, order: _order, ...hit } of kept) {
    const domain = domainOf(hit.url);
    const n = perDomain.get(domain) ?? 0;
    if (n >= 2) continue;
    perDomain.set(domain, n + 1);
    out.push(hit);
    if (out.length === limit) break;
  }
  return out;
}

const MAX_SOURCE_CHARS = 6_000;
const MAX_RESEARCH_SOURCE_CHARS = 1_800;

/** Removes links, images and markup noise; keeps the words. The validator checks quotes against this exact text. */
export function cleanText(markdown: string, maxChars = MAX_SOURCE_CHARS): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

export function toSource(
  index: number,
  hit: SearchHit,
  page: { markdown: string; title: string | null } | null,
): ResearchSource {
  return {
    index,
    url: hit.url,
    domain: domainOf(hit.url),
    title: page?.title || hit.title || domainOf(hit.url),
    publishedAt: hit.publishedAt,
    text: cleanText([hit.excerpt, page?.markdown].filter(Boolean).join("\n\n"), MAX_RESEARCH_SOURCE_CHARS),
    via: page ? "extract" : "search",
  };
}

/** Approved Puntr updates become the only sources for a development article. */
export function projectSources(updates: ProjectUpdate[]): ResearchSource[] {
  return updates.map((u, i) => ({
    index: i + 1,
    url: "https://puntr.co.za/newsroom",
    domain: "puntr.co.za",
    title: u.title,
    publishedAt: u.happenedOn,
    text: cleanText(`${u.title}. ${u.detail} (Date: ${u.happenedOn}.)`),
    via: "project" as const,
  }));
}
