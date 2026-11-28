/**
 * Context awareness: what Puntr knows about the person in front of it, and what to show them next.
 *
 * Signals come from two places:
 * - this device (local storage only: visit count, first and last visit, recent pages, last match opened,
 *   dismissed tips). Nothing here leaves the browser.
 * - the member's own account when signed in (favourites, whether they have posted a pick).
 *
 * The pure functions below turn those signals into a segment and a "next best action", so components can
 * render or hide CTAs, copy and sections consistently instead of each inventing its own rule.
 */

export type Segment =
  | "guest-first" // first visit on this device
  | "guest-returning" // has been here before, not signed in
  | "member-onboarding" // signed in, no pick yet
  | "member-active"; // signed in and has posted at least one pick

export interface LocalSignals {
  visits: number;
  firstVisit: string | null;
  lastVisit: string | null;
  /** Most recent first, without duplicates. Paths only, no query strings. */
  recentPaths: string[];
  lastMatchId: string | null;
  dismissed: string[];
}

export interface ContextInput {
  isSignedIn: boolean;
  pickCount: number | null;
  hasFavourites: boolean;
  isStandalone: boolean;
  local: LocalSignals;
}

export const EMPTY_SIGNALS: LocalSignals = {
  visits: 0,
  firstVisit: null,
  lastVisit: null,
  recentPaths: [],
  lastMatchId: null,
  dismissed: [],
};

export function deriveSegment(
  input: Pick<ContextInput, "isSignedIn" | "pickCount" | "local">,
): Segment {
  if (!input.isSignedIn) return input.local.visits > 1 ? "guest-returning" : "guest-first";
  return (input.pickCount ?? 0) > 0 ? "member-active" : "member-onboarding";
}

export type ActionKey =
  "join" | "learn" | "firstPick" | "favourites" | "practice" | "continueMatch" | "leaderboard";

export interface NextAction {
  key: ActionKey;
  to: string;
  params?: Record<string, string>;
  hash?: string;
}

/**
 * The single most useful next step for this person. Order matters: the first rule that applies wins.
 * Guests are steered to join (returning guests) or to learn first (first visit); members to their first pick,
 * then to favourites, then back to the match they last opened, then to their standing.
 */
export function nextBestAction(input: ContextInput): NextAction {
  const segment = deriveSegment(input);
  if (segment === "guest-first") return { key: "learn", to: "/how-it-works" };
  if (segment === "guest-returning") return { key: "join", to: "/join" };
  if (segment === "member-onboarding") return { key: "firstPick", to: "/fixtures" };
  if (!input.hasFavourites) return { key: "favourites", to: "/account", hash: "favourites" };
  if (input.local.lastMatchId)
    return {
      key: "continueMatch",
      to: "/match/$fixtureId",
      params: { fixtureId: input.local.lastMatchId },
    };
  return { key: "leaderboard", to: "/leaderboards" };
}

/** Morning, afternoon or evening in South African time. */
export function partOfDay(now: Date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-ZA", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Johannesburg",
    }).format(now),
  );
  if (hour < 5) return "evening";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Folds a page view into the signals. A new "visit" starts after 30 minutes away. */
export function foldVisit(
  signals: LocalSignals,
  path: string,
  now: Date = new Date(),
): LocalSignals {
  const iso = now.toISOString();
  const gap = signals.lastVisit ? now.getTime() - Date.parse(signals.lastVisit) : Infinity;
  const clean = path.split("?")[0]!.split("#")[0]!.slice(0, 120) || "/";
  const match = /^\/match\/([^/]+)$/.exec(clean);
  return {
    ...signals,
    visits: gap > 30 * 60_000 ? signals.visits + 1 : Math.max(signals.visits, 1),
    firstVisit: signals.firstVisit ?? iso,
    lastVisit: iso,
    recentPaths: [clean, ...signals.recentPaths.filter((p) => p !== clean)].slice(0, 8),
    lastMatchId: match ? safeDecode(match[1]!) : signals.lastMatchId,
  };
}

const KEY = "puntr:context:v1";

export function readSignals(): LocalSignals {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_SIGNALS;
    const parsed = JSON.parse(raw) as Partial<LocalSignals>;
    return {
      visits: typeof parsed.visits === "number" ? parsed.visits : 0,
      firstVisit: typeof parsed.firstVisit === "string" ? parsed.firstVisit : null,
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : null,
      recentPaths: Array.isArray(parsed.recentPaths)
        ? parsed.recentPaths.filter((p) => typeof p === "string")
        : [],
      lastMatchId: typeof parsed.lastMatchId === "string" ? parsed.lastMatchId : null,
      dismissed: Array.isArray(parsed.dismissed)
        ? parsed.dismissed.filter((p) => typeof p === "string")
        : [],
    };
  } catch {
    return EMPTY_SIGNALS;
  }
}

export function writeSignals(signals: LocalSignals) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(signals));
  } catch {
    // Storage blocked: context falls back to defaults for this session.
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
