/**
 * Site search: a small, pure ranking over pages, competitions, teams and fixtures.
 * The dialog (src/components/search/site-search.tsx) builds the items; this file only scores and groups them,
 * so it stays testable and fast enough to run on every keystroke.
 */

export type SearchKind = "page" | "competition" | "team" | "fixture";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  /** Route path, e.g. "/match/$fixtureId". */
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  /** Extra words that should match (nicknames, synonyms). Never shown. */
  keywords?: string[];
}

/** Lower-case and strip accents, so "Genève" matches "geneve" and "Atlético" matches "atletico". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * 0 means no match. Higher is better:
 * 100 exact title, 80 title starts with the term, 60 a word in the title starts with it,
 * 40 title contains it, 30 a keyword starts with it, 20 a keyword or subtitle contains it.
 */
export function scoreItem(item: SearchItem, rawTerm: string): number {
  const term = normalise(rawTerm);
  if (!term) return 0;
  const title = normalise(item.title);
  if (title === term) return 100;
  if (title.startsWith(term)) return 80;
  if (title.split(/[\s\-–.,()/]+/).some((word) => word.startsWith(term))) return 60;
  if (title.includes(term)) return 40;
  const keywords = (item.keywords ?? []).map(normalise);
  if (keywords.some((k) => k.startsWith(term))) return 30;
  if (keywords.some((k) => k.includes(term))) return 20;
  if (item.subtitle && normalise(item.subtitle).includes(term)) return 20;
  return 0;
}

export const KIND_ORDER: readonly SearchKind[] = ["team", "fixture", "competition", "page"];

export interface SearchGroup {
  kind: SearchKind;
  items: SearchItem[];
}

/** Ranks every item against the term and returns non-empty groups in KIND_ORDER, best first within each group. */
export function searchItems(
  items: readonly SearchItem[],
  term: string,
  limitPerKind: Partial<Record<SearchKind, number>> = {},
): SearchGroup[] {
  const scored = new Map<SearchKind, { item: SearchItem; score: number }[]>();
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    const score = scoreItem(item, term);
    if (score === 0) continue;
    seen.add(key);
    const list = scored.get(item.kind) ?? [];
    list.push({ item, score });
    scored.set(item.kind, list);
  }
  return KIND_ORDER.flatMap((kind) => {
    const list = scored.get(kind);
    if (!list?.length) return [];
    const limit = limitPerKind[kind] ?? 5;
    const sorted = list
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, limit)
      .map((entry) => entry.item);
    return [{ kind, items: sorted }];
  });
}

/** Recent searches kept on this device only (no personal data leaves the browser). */
const RECENT_KEY = "puntr:search:recent";
const RECENT_MAX = 6;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function pushRecent(term: string): string[] {
  const clean = term.trim().slice(0, 60);
  if (clean.length < 2) return readRecent();
  const next = [clean, ...readRecent().filter((v) => normalise(v) !== normalise(clean))].slice(
    0,
    RECENT_MAX,
  );
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: recents are a convenience only.
  }
  return next;
}

export function clearRecent() {
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    // ignore
  }
}

/** Opens the site search from anywhere (header button, dock, empty states). */
export function openSiteSearch(initial?: string) {
  window.dispatchEvent(new CustomEvent("puntr:open-search", { detail: { initial } }));
}
