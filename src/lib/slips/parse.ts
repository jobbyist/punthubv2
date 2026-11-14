/**
 * Betting-slip model, deterministic text parsing and validation. Pure: no I/O, so the browser, the server function
 * and future bookmaker adapters (see adapters.ts) all produce the same SlipDraft shape.
 */

export type SlipMarket = "1X2" | "OU25" | "BTTS" | "DC";
export type SlipSource = "manual" | "text" | "image" | "import";
export type BetType = "single" | "multi" | "system";

export interface SlipLegDraft {
  home: string;
  away: string;
  competition?: string | null;
  /** Puntr market and selection when the bookmaker wording maps to one; null keeps the leg "tracked only". */
  market: SlipMarket | null;
  selection: string | null;
  odds: number | null;
  rawMarket?: string | null;
  rawSelection?: string | null;
  fixtureId?: string | null;
}

export interface SlipDraft {
  bookmaker: string | null;
  betType: BetType;
  stake: number | null;
  totalOdds: number | null;
  potentialReturn: number | null;
  legs: SlipLegDraft[];
}

export const MAX_LEGS = 30;

export const SELECTIONS: Record<SlipMarket, readonly string[]> = {
  "1X2": ["home", "draw", "away"],
  OU25: ["over", "under"],
  BTTS: ["yes", "no"],
  DC: ["1X", "X2", "12"],
};

/** Bookmakers recognised in slip text. Display only (shown to the slip's owner); never a link or promotion. */
export const KNOWN_BOOKMAKERS = [
  "Betway",
  "Hollywoodbets",
  "Supabets",
  "Sportingbet",
  "Betfred",
  "Gbets",
  "Playa Bets",
  "World Sports Betting",
  "Lottostar",
  "Easybet",
  "10bet",
  "Yesplay",
  "Playbet",
  "Sunbet",
  "Betshezi",
] as const;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function detectBookmaker(text: string): string | null {
  const t = norm(text).replace(/ /g, "");
  for (const b of KNOWN_BOOKMAKERS) if (t.includes(norm(b).replace(/ /g, ""))) return b;
  return null;
}

/** Decimal odds from "1.85", "1,85" or fractional "17/20". Null outside 1.01..1000. */
export function parseOdds(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number")
    return raw >= 1.01 && raw <= 1000 ? Math.round(raw * 100) / 100 : null;
  const s = raw.trim().replace(",", ".");
  const frac = /^(\d{1,4})\/(\d{1,4})$/.exec(s);
  const n = frac ? 1 + Number(frac[1]) / Number(frac[2]) : Number(s);
  return Number.isFinite(n) ? parseOdds(n) : null;
}

/** Rand amount from "R50", "R 1 250.00", "50,00". */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number")
    return raw > 0 && raw <= 1_000_000 ? Math.round(raw * 100) / 100 : null;
  const s = raw
    .replace(/[Rr]|ZAR|\s/g, "")
    .replace(/,(\d{2})$/, ".$1")
    .replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? parseAmount(n) : null;
}

/**
 * Maps a bookmaker's market and selection wording to a Puntr market. Returns null for markets Puntr does not grade
 * (correct score, handicaps, player props, other goal lines): those legs are kept on the slip as tracked only.
 */
export function mapMarket(
  rawMarket: string,
  rawSelection: string,
  home: string,
  away: string,
): { market: SlipMarket; selection: string } | null {
  const m = norm(rawMarket);
  const s = norm(rawSelection);
  const h = norm(home);
  const a = norm(away);
  const isHome = (x: string) => x === "1" || x === "home" || (!!h && (x === h || x.includes(h)));
  const isAway = (x: string) => x === "2" || x === "away" || (!!a && (x === a || x.includes(a)));

  if (/double chance|^dc$/.test(m)) {
    const c = s.replace(/ or | /g, "").replace(/draw/g, "x");
    if (c === "1x" || (s.includes("draw") && isHome(s.replace(/ or draw|draw or /, ""))))
      return { market: "DC", selection: "1X" };
    if (c === "x2" || (s.includes("draw") && isAway(s.replace(/ or draw|draw or /, ""))))
      return { market: "DC", selection: "X2" };
    if (c === "12") return { market: "DC", selection: "12" };
    return null;
  }
  if (/both teams to score|btts|gg ng|both score/.test(m)) {
    if (/^(yes|gg|y)$/.test(s)) return { market: "BTTS", selection: "yes" };
    if (/^(no|ng|n)$/.test(s)) return { market: "BTTS", selection: "no" };
    return null;
  }
  if (/over|under|total goals|goals o u|o u/.test(m) || /^(over|under) 2.5/.test(s)) {
    // Only the 2.5 line is graded.
    if (!/2\.5/.test(`${m} ${s}`)) return null;
    if (/over|^o\b/.test(s)) return { market: "OU25", selection: "over" };
    if (/under|^u\b/.test(s)) return { market: "OU25", selection: "under" };
    return null;
  }
  if (
    /1x2|match result|full time result|match winner|^ft result|3 way|three way|^result$|win draw win/.test(
      m,
    )
  ) {
    if (/^(x|draw|tie)$/.test(s)) return { market: "1X2", selection: "draw" };
    if (isHome(s)) return { market: "1X2", selection: "home" };
    if (isAway(s)) return { market: "1X2", selection: "away" };
  }
  return null;
}

const VS = /\s+(?:v|vs\.?)\s+/i;
const ODDS_AT_END = /(?:@\s*)?(\d{1,4}(?:[.,]\d{1,2})?|\d{1,3}\/\d{1,3})\s*$/;

/**
 * Best-effort parser for pasted or OCR'd slip text. It finds "Home v Away" lines and reads the market, selection
 * and odds from that line or the next two. Members review everything, so this aims to save typing, not to be
 * complete; the server falls back to Gemini (scrubbed text only) when it finds no legs.
 */
export function parseSlipText(text: string): SlipDraft {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const legs: SlipLegDraft[] = [];
  for (let i = 0; i < lines.length && legs.length < MAX_LEGS; i++) {
    const line = lines[i]!;
    if (!VS.test(line)) continue;
    const [homeRaw, rest = ""] = line.split(VS, 2) as [string, string?];
    const awayRaw = rest
      .replace(/\s+\d{1,2}[:h]\d{2}.*$/, "")
      .replace(ODDS_AT_END, "")
      .trim();
    const home = homeRaw.replace(/^\d{1,2}[:h]\d{2}\s*/, "").trim();
    if (!home || !awayRaw || home.length > 60 || awayRaw.length > 60) continue;
    const near = lines.slice(i + 1, i + 3);
    let rawMarket = "";
    let rawSelection = "";
    let odds: number | null = null;
    for (const n of near) {
      if (VS.test(n)) break;
      const o = ODDS_AT_END.exec(n);
      const body = o ? n.slice(0, o.index).replace(/@\s*$/, "").trim() : n;
      if (o && odds == null) odds = parseOdds(o[1]!);
      const parts = body.split(/\s*[:|\-–]\s*/);
      if (parts.length >= 2 && !rawMarket) {
        rawMarket = parts[0]!;
        rawSelection = parts.slice(1).join(" ");
      } else if (!rawMarket && body) rawMarket = body;
      else if (!rawSelection && body) rawSelection = body;
    }
    const mapped = rawMarket ? mapMarket(rawMarket, rawSelection, home, awayRaw) : null;
    legs.push({
      home,
      away: awayRaw,
      market: mapped?.market ?? null,
      selection: mapped?.selection ?? null,
      odds,
      rawMarket: rawMarket || null,
      rawSelection: rawSelection || null,
    });
  }
  const find = (re: RegExp) => {
    for (const l of lines) {
      const m = re.exec(l);
      if (m) return m[1]!;
    }
    return null;
  };
  const stake = parseAmount(find(/(?:total\s+)?stake[^\dR]*(R?\s?[\d\s,.]+)/i));
  const potentialReturn = parseAmount(
    find(/(?:potential|possible|to)\s*(?:win(?:nings)?|returns?|payout)[^\dR]*(R?\s?[\d\s,.]+)/i),
  );
  const totalOdds = parseOdds(find(/total\s+odds[^\d]*(\d+(?:[.,]\d{1,2})?)/i));
  return {
    bookmaker: detectBookmaker(text),
    betType: legs.length > 1 ? "multi" : "single",
    stake,
    totalOdds: totalOdds ?? combinedOdds(legs),
    potentialReturn,
    legs,
  };
}

export function combinedOdds(legs: readonly SlipLegDraft[]): number | null {
  if (!legs.length || legs.some((l) => l.odds == null)) return null;
  const p = legs.reduce((acc, l) => acc * (l.odds as number), 1);
  return p <= 1_000_000 ? Math.round(p * 100) / 100 : null;
}

export type SlipIssue =
  "no_legs" | "too_many_legs" | "leg_teams" | "leg_odds" | "leg_selection" | "stake" | "return";

/** Problems that block saving. A leg without a Puntr market is allowed (tracked only). */
export function validateDraft(d: SlipDraft): SlipIssue[] {
  const issues = new Set<SlipIssue>();
  if (!d.legs.length) issues.add("no_legs");
  if (d.legs.length > MAX_LEGS) issues.add("too_many_legs");
  for (const l of d.legs) {
    if (!l.home.trim() || !l.away.trim() || l.home.length > 80 || l.away.length > 80)
      issues.add("leg_teams");
    if (l.odds != null && parseOdds(l.odds) == null) issues.add("leg_odds");
    if (l.market && (!l.selection || !SELECTIONS[l.market].includes(l.selection)))
      issues.add("leg_selection");
    if (!l.market && l.selection) issues.add("leg_selection");
  }
  if (d.stake != null && parseAmount(d.stake) == null) issues.add("stake");
  if (d.potentialReturn != null && (d.potentialReturn < 0 || d.potentialReturn > 100_000_000))
    issues.add("return");
  return [...issues];
}

/** Coerces untrusted JSON (from Gemini or an adapter) into a SlipDraft, dropping anything malformed. */
export function coerceDraft(raw: unknown): SlipDraft {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const legsRaw = Array.isArray(o["legs"]) ? o["legs"].slice(0, MAX_LEGS) : [];
  const legs: SlipLegDraft[] = [];
  for (const lr of legsRaw) {
    const l = (lr && typeof lr === "object" ? lr : {}) as Record<string, unknown>;
    const home = str(l["home"]);
    const away = str(l["away"]);
    if (!home || !away) continue;
    const rawMarket = str(l["market"], 120);
    const rawSelection = str(l["selection"], 120);
    const mapped = rawMarket ? mapMarket(rawMarket, rawSelection, home, away) : null;
    legs.push({
      home,
      away,
      competition: str(l["competition"]) || null,
      market: mapped?.market ?? null,
      selection: mapped?.selection ?? null,
      odds: parseOdds(
        typeof l["odds"] === "number" || typeof l["odds"] === "string" ? l["odds"] : null,
      ),
      rawMarket: rawMarket || null,
      rawSelection: rawSelection || null,
    });
  }
  const bm = str(o["bookmaker"], 40);
  return {
    bookmaker: (bm && detectBookmaker(bm)) || null,
    betType: legs.length > 1 ? "multi" : "single",
    stake: parseAmount(
      typeof o["stake"] === "number" || typeof o["stake"] === "string" ? o["stake"] : null,
    ),
    totalOdds:
      parseOdds(
        typeof o["totalOdds"] === "number" || typeof o["totalOdds"] === "string"
          ? o["totalOdds"]
          : null,
      ) ?? combinedOdds(legs),
    potentialReturn: parseAmount(
      typeof o["potentialReturn"] === "number" || typeof o["potentialReturn"] === "string"
        ? o["potentialReturn"]
        : null,
    ),
    legs,
  };
}
