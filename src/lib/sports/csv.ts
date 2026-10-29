import type { Sport } from "./types";

export interface CsvFixture {
  sport: Sport;
  competition: string;
  home: string;
  away: string;
  /** ISO 8601 with an explicit offset, e.g. 2026-11-07T17:30:00+02:00. */
  kickoffAt: string;
}

export interface CsvResult {
  rows: CsvFixture[];
  errors: { line: number; message: string }[];
}

// Byte-order mark some spreadsheet exports prepend.
const BOM = String.fromCharCode(0xfeff);
const HEADER = ["sport", "competition", "home", "away", "kickoff_at"];
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;

/** Splits one CSV line, honouring double quotes and "" escapes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Fallback import for fixtures the provider misses. Any bad row is reported and nothing is imported by the caller. */
export function parseFixtureCsv(text: string): CsvResult {
  const lines = text
    .replace(BOM, "")
    .split(/\r?\n/)
    .map((l, i) => ({ l, n: i + 1 }))
    .filter((x) => x.l.trim() !== "");
  const result: CsvResult = { rows: [], errors: [] };
  if (lines.length === 0) {
    result.errors.push({ line: 1, message: "The file is empty." });
    return result;
  }
  const head = splitCsvLine(lines[0]!.l).map((h) => h.toLowerCase());
  if (head.join(",") !== HEADER.join(",")) {
    result.errors.push({ line: lines[0]!.n, message: `Header must be: ${HEADER.join(",")}` });
    return result;
  }
  for (const { l, n } of lines.slice(1)) {
    const cells = splitCsvLine(l);
    if (cells.length !== HEADER.length) {
      result.errors.push({
        line: n,
        message: `Expected ${HEADER.length} columns, found ${cells.length}.`,
      });
      continue;
    }
    const [sport, competition, home, away, kickoff] = cells as [
      string,
      string,
      string,
      string,
      string,
    ];
    if (sport !== "soccer" && sport !== "rugby") {
      result.errors.push({ line: n, message: 'sport must be "soccer" or "rugby".' });
      continue;
    }
    if (!competition || !home || !away) {
      result.errors.push({ line: n, message: "competition, home and away are required." });
      continue;
    }
    if (home.toLowerCase() === away.toLowerCase()) {
      result.errors.push({ line: n, message: "home and away must differ." });
      continue;
    }
    if (!ISO_WITH_OFFSET.test(kickoff) || Number.isNaN(Date.parse(kickoff))) {
      result.errors.push({
        line: n,
        message: "kickoff_at must be ISO 8601 with an offset, e.g. 2026-11-07T17:30:00+02:00.",
      });
      continue;
    }
    result.rows.push({
      sport,
      competition,
      home,
      away,
      kickoffAt: new Date(kickoff).toISOString(),
    });
  }
  return result;
}

/** Stable reference so re-importing the same file updates rather than duplicates. */
export function csvProviderRef(row: CsvFixture): string {
  return [row.sport, row.competition, row.home, row.away, row.kickoffAt].join("|").toLowerCase();
}
