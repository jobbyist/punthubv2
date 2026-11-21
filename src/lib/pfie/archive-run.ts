/**
 * Runs the season archive import (see archive.ts). One job = one competition season = two page reads. Finished
 * seasons are imported once; the current season is refreshed at most once every 20 hours. This path imports
 * historical results only; current league tables are owned by the live multi-source standings job. Every attempt
 * is recorded in `sync_status` as job `archive`, scope `<key>:<startYear>`.
 */
import { seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import {
  ARCHIVE_SOURCES,
  archiveCompetition,
  archiveSeasons,
  archiveUrls,
  parseFbrefSchedule,
  parseResultsMatrix,
  reconcileSeason,
} from "./archive";
import { retryDue, type SyncStatusRow, type TablesDeps } from "./tables";

const HOUR = 3_600_000;

export function archiveJobsDue(
  deps: Pick<TablesDeps, "now">,
  statuses: SyncStatusRow[],
  only?: CompetitionKey[],
): { key: CompetitionKey; year: number }[] {
  const now = (deps.now ?? (() => new Date()))();
  const current = seasonFor("july", now);
  const due: { key: CompetitionKey; year: number }[] = [];
  // Newest season first, so the current season and last season fill before the one before.
  for (const year of archiveSeasons(now)) {
    for (const key of Object.keys(ARCHIVE_SOURCES) as CompetitionKey[]) {
      if (only && !only.includes(key)) continue;
      const s = statuses.find((x) => x.job === "archive" && x.scope === `${key}:${year}`);
      if (s && s.consecutiveFailures >= 5) continue;
      if (s?.lastSuccessAt) {
        if (year !== current) continue;
        if (now.getTime() - Date.parse(s.lastSuccessAt) < 20 * HOUR) continue;
      }
      if (retryDue(s, now)) due.push({ key, year });
    }
  }
  return due;
}

export async function runArchiveJob(
  deps: TablesDeps,
  key: CompetitionKey,
  year: number,
): Promise<{ ok: boolean; detail: string }> {
  const scope = `${key}:${year}`;
  const c = archiveCompetition(key);
  const now = (deps.now ?? (() => new Date()))();
  try {
    if (!deps.extract) throw new Error("no page reader configured");
    const urls = archiveUrls(ARCHIVE_SOURCES[key]!, year);
    const [fb, wiki] = await Promise.all([
      deps.extract.extract(urls.fbref),
      deps.extract.extract(urls.wikipedia),
    ]);
    if (!fb?.markdown) throw new Error("fbref page empty");
    if (!wiki?.markdown) throw new Error("wikipedia page empty");
    const matches = parseFbrefSchedule(fb.markdown);
    const matrix = parseResultsMatrix(wiki.markdown);
    if (matches.length === 0) throw new Error("no played matches on the fbref page");
    if (!matrix) {
      // Diagnostics: what the reader returned around the results table (public page text only).
      const md = wiki.markdown;
      const at = md.search(/home\s*\\*\s*away/i);
      await deps.store.record("archive", scope, false, "no results matrix on the wikipedia page", {
        wikiChars: md.length,
        tableLines: md.split("\n").filter((l) => l.trimStart().startsWith("|")).length,
        homeAwayAt: at,
        snippet: at >= 0 ? md.slice(Math.max(0, at - 40), at + 600) : md.slice(0, 300),
      });
      return { ok: false, detail: "no results matrix on the wikipedia page" };
    }
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const { rows, report } = reconcileSeason(key, matches, matrix, known);
    const inserted = rows.length
      ? await deps.store.insertHistory(rows.map((r) => ({ ...r, competition: c.name })))
      : 0;

    const meta = { ...report, inserted, table: "not checked" };
    if (rows.length === 0) {
      await deps.store.record("archive", scope, false, "no matches confirmed by both pages", meta);
      return { ok: false, detail: `nothing confirmed (${JSON.stringify(report)})` };
    }

    // Archive/Wikipedia sources are retained only for historical result reconciliation.
    // Current league standings are sourced separately through Parallel's live multi-source PFIE pipeline.
    const table = "deferred to live multi-source standings sync";

    await deps.store.record("archive", scope, true, null, { ...meta, table });
    return {
      ok: true,
      detail: `${inserted} new of ${rows.length} confirmed (${report.disagreed} disagreed, ${report.unmatched} unmatched); standings ${table}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 280) : "unexpected error";
    await deps.store.record("archive", scope, false, msg, {}).catch(() => undefined);
    return { ok: false, detail: msg };
  }
}
