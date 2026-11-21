/**
 * Season archive import: whole seasons of league results from two independent full-season pages, compared in code.
 *
 * - FBref's "Scores & Fixtures" page lists every match with its date, teams and score in one table.
 * - Wikipedia's season article carries the home/away results matrix (rows = home team, columns = away team, the
 *   columns identified by the same club links as the rows).
 *
 * Both pages are read with Parallel Extract (about US$0.001 a page) and parsed deterministically: no model is
 * involved. A result is stored only when both pages give the same score for the same home and away team; the date
 * comes from FBref. Any disagreement, an unmatched team or a missing cell leaves the match out. Double round-robin
 * leagues only (each pair meets once at each ground), which is what makes the matrix unambiguous.
 *
 * Current league standings are deliberately excluded from this archive path. The live standings job uses
 * Parallel Search + fresh Parallel Extract pages and independent full-table corroboration.
 */
import { competitions, seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import type { HistoryRow } from "./history";
import type { StandingRow } from "./standings";
import { normaliseTeam, resolveTeam } from "./teams";

export interface ArchiveSource {
  fbrefId: number;
  fbrefName: string;
  wikiTitle: string;
}

/** Domestic double round-robin leagues with an FBref schedule page and a Wikipedia results matrix. */
export const ARCHIVE_SOURCES: Partial<Record<CompetitionKey, ArchiveSource>> = {
  psl: { fbrefId: 52, fbrefName: "Premiership", wikiTitle: "South_African_Premiership" },
  epl: { fbrefId: 9, fbrefName: "Premier-League", wikiTitle: "Premier_League" },
  laliga: { fbrefId: 12, fbrefName: "La-Liga", wikiTitle: "La_Liga" },
  seriea: { fbrefId: 11, fbrefName: "Serie-A", wikiTitle: "Serie_A" },
  bundesliga: { fbrefId: 20, fbrefName: "Bundesliga", wikiTitle: "Bundesliga" },
  ligue1: { fbrefId: 13, fbrefName: "Ligue-1", wikiTitle: "Ligue_1" },
  eredivisie: { fbrefId: 23, fbrefName: "Eredivisie", wikiTitle: "Eredivisie" },
  primeira: { fbrefId: 32, fbrefName: "Primeira-Liga", wikiTitle: "Primeira_Liga" },
  championship: { fbrefId: 10, fbrefName: "Championship", wikiTitle: "EFL_Championship" },
  "saudi-pro": {
    fbrefId: 70,
    fbrefName: "Saudi-Professional-League",
    wikiTitle: "Saudi_Pro_League",
  },
};

/** Season start years to import: two finished seasons plus the current one. */
export function archiveSeasons(now: Date): number[] {
  const current = seasonFor("july", now);
  return [current, current - 1, current - 2];
}

export function archiveUrls(src: ArchiveSource, startYear: number) {
  const fb = `${startYear}-${startYear + 1}`;
  const wiki = `${startYear}%E2%80%93${String(startYear + 1).slice(2)}_${src.wikiTitle}`;
  return {
    fbref: `https://fbref.com/en/comps/${src.fbrefId}/${fb}/schedule/${fb}-${src.fbrefName}-Scores-and-Fixtures`,
    wikipedia: `https://en.wikipedia.org/wiki/${wiki}`,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Parsing helpers

const LINK = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * Markdown split into logical lines with table rows rejoined: a row that starts with "|" and does not yet end
 * with "|" (a long link title wrapped onto the next line, sometimes across a blank line) continues until it does.
 * Separator rows (`| --- | :-: |`) are dropped.
 */
export function tableLines(markdown: string): string[] {
  const out: string[] = [];
  let open: string | null = null;
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (open !== null) {
      open = `${open} ${line.trim()}`.trimEnd();
      if (open.endsWith("|")) {
        out.push(open);
        open = null;
      } else if (open.length > 20_000) {
        // A row this long is malformed: drop it rather than hand a broken row to the parsers.
        open = null;
      }
      continue;
    }
    if (line.trimStart().startsWith("|") && !line.endsWith("|")) {
      open = line;
      continue;
    }
    out.push(line);
  }
  return out.filter((l) => !/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(l));
}

/** Cells of one markdown table row, links kept as written. */
export function cells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  // Split on pipes that are not inside a link title or URL (titles never contain pipes on these pages).
  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const linkText = (cell: string) => cell.replace(LINK, "$1").replace(/\s+/g, " ").trim();
const firstHref = (cell: string) => {
  const m = /\]\(([^)\s]+)/.exec(cell);
  return m ? m[1]! : null;
};

/** "2–1", "[2–1](...)", "2-1 [a]" -> [2, 1]. Anything else (—, blank, "a", "Awd") -> null. */
export function parseScore(cell: string): [number, number] | null {
  const m = /^\s*(\d{1,2})\s*[–-]\s*(\d{1,2})(?:\s|$|\[|\()/.exec(linkText(cell) + " ");
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** "Nottingham-Forest-Stats" from an FBref squad link -> "Nottingham Forest". */
function fbrefSquadName(cell: string): string {
  const href = firstHref(cell);
  const m = href ? /\/squads\/[^/]+\/(?:\d{4}-\d{4}\/)?([^/?#]+)-Stats/.exec(href) : null;
  return m ? decodeURIComponent(m[1]!).replace(/-/g, " ") : linkText(cell);
}

export interface FbrefMatch {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

/** Every played match in an FBref Scores & Fixtures page. Header rows decide the column positions. */
export function parseFbrefSchedule(markdown: string): FbrefMatch[] {
  const out: FbrefMatch[] = [];
  const seen = new Set<string>();
  let cols: { date: number; home: number; score: number; away: number } | null = null;
  for (const line of tableLines(markdown)) {
    const row = cells(line);
    if (row.length < 5) continue;
    const plain = row.map(linkText);
    if (plain.includes("Date") && plain.includes("Home") && plain.includes("Away")) {
      cols = {
        date: plain.indexOf("Date"),
        home: plain.indexOf("Home"),
        score: plain.indexOf("Score"),
        away: plain.indexOf("Away"),
      };
      continue;
    }
    if (!cols || cols.score < 0) continue;
    const date = plain[cols.date] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const score = parseScore(row[cols.score] ?? "");
    if (!score) continue; // not played yet, postponed or awarded
    const home = fbrefSquadName(row[cols.home] ?? "");
    const away = fbrefSquadName(row[cols.away] ?? "");
    if (!home || !away || normaliseTeam(home) === normaliseTeam(away)) continue;
    const key = `${date}|${normaliseTeam(home)}|${normaliseTeam(away)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date, home, away, homeScore: score[0], awayScore: score[1] });
  }
  return out;
}

export interface ResultsMatrix {
  teams: string[];
  /** `${homeIndex}:${awayIndex}` -> score */
  scores: Map<string, [number, number]>;
}

/**
 * The Wikipedia results matrix. The header row lists the away teams as club links (often abbreviations); each body
 * row starts with the home team's club link. A column belongs to the row whose link it shares, so abbreviations never
 * have to be guessed. Returns null when no complete, square matrix is found.
 */
export function parseResultsMatrix(markdown: string): ResultsMatrix | null {
  const lines = tableLines(markdown);
  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i]!);
    if (header.length < 4 || !/home\s*\\*\s*away/i.test(linkText(header[0] ?? ""))) continue;
    const colHrefs = header.slice(1).map(firstHref);
    if (colHrefs.some((h) => !h)) continue;
    const teams: string[] = [];
    const rowHrefs: string[] = [];
    const body: string[][] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const row = cells(lines[j]!);
      if (row.length !== header.length) break;
      const href = firstHref(row[0] ?? "");
      if (!href) break;
      teams.push(linkText(row[0]!));
      rowHrefs.push(href);
      body.push(row.slice(1));
    }
    if (teams.length !== colHrefs.length) continue;
    const colToRow = colHrefs.map((h) => rowHrefs.indexOf(h!));
    if (colToRow.some((r) => r < 0) || new Set(colToRow).size !== colToRow.length) continue;
    const scores = new Map<string, [number, number]>();
    body.forEach((row, homeIdx) =>
      row.forEach((cell, col) => {
        const awayIdx = colToRow[col]!;
        if (awayIdx === homeIdx) return;
        const s = parseScore(cell);
        if (s) scores.set(`${homeIdx}:${awayIdx}`, s);
      }),
    );
    return { teams, scores };
  }
  return null;
}

/** Legacy parser for historical archive diagnostics only. Never used to publish current league standings. */
export function parseWikiTable(markdown: string): StandingRow[] | null {
  const lines = tableLines(markdown);
  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i]!).map(linkText);
    // Wikipedia appends "vte" (view-talk-edit) to some headers and may suffix footnote marks: match by prefix.
    const at = (name: string) =>
      header.findIndex((h) => h === name || (name === "Team" && /^Team(\s|\[|$)/.test(h)));
    if (at("Pos") !== 0 || at("Team") < 0 || at("Pld") < 0 || at("Pts") < 0) continue;
    const idx = {
      team: at("Team"),
      p: at("Pld"),
      w: at("W"),
      d: at("D"),
      l: at("L"),
      gf: at("GF"),
      ga: at("GA"),
      pts: at("Pts"),
    };
    if (Object.values(idx).some((v) => v < 0)) continue;
    const rows: StandingRow[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const row = cells(lines[j]!);
      // Trailing columns (qualification notes) may be empty and dropped by the reader: only the stat columns count.
      if (row.length <= Math.max(...Object.values(idx))) break;
      const num = (k: number) => Number(linkText(row[k] ?? "").replace(/[^\d]/g, ""));
      const position = num(0);
      if (!position) break;
      const team = linkText(row[idx.team] ?? "")
        .replace(/\s*\((?:[A-Z]|[A-Z],\s*[A-Z])\)\s*$/, "")
        .replace(/\s*\[[^\]]*\]\s*/g, "")
        .trim();
      rows.push({
        position,
        team,
        played: num(idx.p),
        won: num(idx.w),
        drawn: num(idx.d),
        lost: num(idx.l),
        goalsFor: num(idx.gf),
        goalsAgainst: num(idx.ga),
        points: num(idx.pts),
      });
    }
    return rows.length >= 6 ? rows : null;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Reconciliation

/**
 * FBref club names that Wikipedia season pages shorten or spell differently, keyed by the normalised FBref name.
 * Kept out of the shared aliases on purpose: those also build badge file names and fixture keys.
 */
const ARCHIVE_NAMES: Record<string, string> = {
  athletic: "Athletic Bilbao",
  psv: "PSV Eindhoven",
  "nec nijmegen": "NEC",
  "az alkmaar": "AZ",
  "sparta r": "Sparta Rotterdam",
};

export interface ArchiveReport {
  fbref: number;
  matrix: number;
  verified: number;
  disagreed: number;
  unmatched: number;
  /** FBref names that did not resolve to a matrix team (distinct, first 12), to guide alias fixes. */
  unmatchedNames?: string[];
}

/**
 * Keeps each FBref match whose score the matrix confirms. Team names: FBref's squad-link names are matched to the
 * matrix teams with the same ambiguity-safe resolver PFIE uses; stored names prefer teams already known to Puntr.
 */
export function reconcileSeason(
  key: CompetitionKey,
  matches: FbrefMatch[],
  matrix: ResultsMatrix,
  knownTeams: readonly string[] = [],
): { rows: HistoryRow[]; report: ArchiveReport } {
  const report: ArchiveReport = {
    fbref: matches.length,
    matrix: matrix.scores.size,
    verified: 0,
    disagreed: 0,
    unmatched: 0,
  };
  const index = (name: string) => {
    const hit = resolveTeam(ARCHIVE_NAMES[normaliseTeam(name)] ?? name, matrix.teams);
    return hit && hit !== "ambiguous" ? matrix.teams.indexOf(hit) : -1;
  };
  const display = (fbName: string, wikiName: string) => {
    for (const candidate of [wikiName, fbName]) {
      const k = knownTeams.length ? resolveTeam(candidate, knownTeams) : null;
      if (k && k !== "ambiguous") return k;
    }
    return wikiName;
  };
  const rows: HistoryRow[] = [];
  const missing = new Set<string>();
  for (const m of matches) {
    const h = index(m.home);
    const a = index(m.away);
    if (h < 0 || a < 0 || h === a) {
      report.unmatched++;
      if (h < 0) missing.add(m.home);
      if (a < 0) missing.add(m.away);
      continue;
    }
    const cell = matrix.scores.get(`${h}:${a}`);
    if (!cell) {
      report.unmatched++;
      continue;
    }
    if (cell[0] !== m.homeScore || cell[1] !== m.awayScore) {
      report.disagreed++;
      continue;
    }
    rows.push({
      competitionKey: key,
      matchDate: m.date,
      home: display(m.home, matrix.teams[h]!),
      away: display(m.away, matrix.teams[a]!),
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      sourceDomains: ["fbref.com", "wikipedia.org"],
    });
  }
  report.verified = rows.length;
  if (missing.size) report.unmatchedNames = [...missing].slice(0, 12);
  return { rows, report };
}

/**
 * Legacy historical-table consistency helper. The live standings publisher does not call this function.
 * The Wikipedia table is accepted only when every row matches the verified results exactly (played, W, D, L, GF,
 * GA), points equal 3W + D (a deduction fails and the table is left to the daily job), positions run 1..N and every
 * team has results. Returns the rows with stored team names, or the reason it failed.
 */
export function corroborateTable(
  table: StandingRow[],
  results: HistoryRow[],
): { rows: StandingRow[] } | { reason: string } {
  const stats = new Map<
    string,
    { name: string; p: number; w: number; d: number; l: number; gf: number; ga: number }
  >();
  const add = (name: string, gf: number, ga: number) => {
    const k = normaliseTeam(name);
    const s = stats.get(k) ?? { name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    s.p++;
    s.gf += gf;
    s.ga += ga;
    if (gf > ga) s.w++;
    else if (gf === ga) s.d++;
    else s.l++;
    stats.set(k, s);
  };
  for (const r of results) {
    add(r.home, r.homeScore, r.awayScore);
    add(r.away, r.awayScore, r.homeScore);
  }
  if (table.length !== stats.size) return { reason: `teams ${table.length} vs ${stats.size}` };
  const names = [...stats.values()].map((s) => s.name);
  const positions = new Set(table.map((r) => r.position));
  if (positions.size !== table.length || [...positions].some((p) => p < 1 || p > table.length))
    return { reason: "positions" };
  const rows: StandingRow[] = [];
  for (const r of table) {
    const hit = resolveTeam(r.team, names);
    if (!hit || hit === "ambiguous") return { reason: `team ${r.team}` };
    const s = stats.get(normaliseTeam(hit))!;
    if (
      s.p !== r.played ||
      s.w !== r.won ||
      s.d !== r.drawn ||
      s.l !== r.lost ||
      s.gf !== r.goalsFor ||
      s.ga !== r.goalsAgainst ||
      r.points !== 3 * r.won + r.drawn
    )
      return { reason: `stats ${r.team}` };
    rows.push({ ...r, team: s.name });
  }
  return { rows };
}

export function archiveCompetition(key: CompetitionKey) {
  return competitions.find((c) => c.key === key)!;
}
