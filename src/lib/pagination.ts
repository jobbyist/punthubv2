/** Shared helpers for crawlable, numbered pagination. */

/** Fixtures per page: 10 keeps each page light on phones and gives search engines stable, linkable pages. */
export const FIXTURES_PER_PAGE = 10;

/** 1-based page clamped to what exists; `pages` is at least 1. */
export function paginate<T>(items: T[], page: number | undefined, size = FIXTURES_PER_PAGE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page ?? 1), pages);
  return { pages, current, items: items.slice((current - 1) * size, current * size) };
}

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
export function pageWindow(current: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, current - 1, current, current + 1]);
  const out: (number | null)[] = [];
  for (let n = 1; n <= pages; n++) {
    if (!keep.has(n)) continue;
    const last = out[out.length - 1];
    if (typeof last === "number" && n - last > 1) out.push(null);
    out.push(n);
  }
  return out;
}
