/**
 * MVP readiness: the launch checklist behind the /dev page and its score.
 *
 * The catalogue (workstreams, tasks, weights) lives here so it is reviewed in PRs. What changes day to
 * day lives elsewhere:
 *  - manual tasks: ticked on /dev, stored in `dev_readiness_state` (one row per task id); a stored row
 *    overrides the task's `done` default below;
 *  - metric tasks: read live from the database (Founding Members, passes, fixtures, results, tables)
 *    and scored in proportion to their target.
 *
 * The repo is public: keep task wording free of anything that should not be read by outsiders
 * (no credentials, no unfixed security findings in detail).
 */

export const LAUNCH_AT = "2026-12-01T00:00:00+02:00";

export type MetricKey =
  "foundingMembers" | "annualPasses" | "upcomingFixtures" | "completedResults" | "standingsLeagues";

export type ReadinessTask = {
  id: string;
  title: string;
  /** Relative weight inside its workstream. */
  weight: number;
  /** Must be done before 1 Dec. */
  blocker?: boolean;
  /** Shipped already: the default when no row is stored. */
  done?: boolean;
  /** Scored from live data instead of a tick. */
  metric?: { key: MetricKey; target: number; unit: string };
  /** Where the work is tracked (doc, PR, page). */
  ref?: string;
};

export type Workstream = {
  id: string;
  title: string;
  /** Share of the overall score, in points out of 100. */
  weight: number;
  tasks: ReadinessTask[];
};

export const WORKSTREAMS: Workstream[] = [
  {
    id: "product",
    title: "Core product and community",
    weight: 16,
    tasks: [
      {
        id: "picks-grading",
        title: "Picks, lock at kick-off, grading and settlement",
        weight: 3,
        done: true,
      },
      {
        id: "leaderboards",
        title: "Leaderboards: weekly, competition points, duels",
        weight: 2,
        done: true,
      },
      {
        id: "community",
        title: "Community feed, threads and public profiles",
        weight: 2,
        done: true,
      },
      {
        id: "duels",
        title: "Head-to-head Duels with PuntPoints stakes",
        weight: 2,
        done: true,
        ref: "PR #115, #119",
      },
      {
        id: "slips",
        title: "Betting slips: upload, review, publish",
        weight: 2,
        done: true,
        ref: "PR #122",
      },
      {
        id: "matchday",
        title: "Member Matchday card and favourites",
        weight: 1,
        done: true,
        ref: "PR #116",
      },
      {
        id: "practice",
        title: "Practice Mode (Founding Members)",
        weight: 1,
        done: true,
        ref: "PR #79",
      },
      {
        id: "wallet",
        title: "PuntPoints wallet and transfers",
        weight: 1,
        done: true,
        ref: "PR #84",
      },
      {
        id: "tools-live",
        title: "Every /tools feature live or clearly marked post-launch",
        weight: 2,
        blocker: true,
        ref: "docs/TOOLS_PLAN.md",
      },
      {
        id: "qa-signed-in",
        title: "Signed-in QA on production (slips, duels with two accounts, Matchday)",
        weight: 3,
        blocker: true,
      },
      {
        id: "page-motion",
        title: "Unique motion graphics and design elements on every page (owner, 15 Nov)",
        weight: 2,
      },
      {
        id: "afrikaans-live",
        title: "Afrikaans public: native-speaker sign-off and localised dates",
        weight: 1,
        ref: "docs/MULTILANGUAGE_PLAN.md",
      },
    ],
  },
  {
    id: "data",
    title: "Fixtures, results and historical data",
    weight: 16,
    tasks: [
      {
        id: "pfie-fixtures",
        title: "PFIE fixtures for 21 competitions",
        weight: 2,
        done: true,
        ref: "PR #114",
      },
      {
        id: "standings-sync",
        title: "League tables and form sync (12 leagues)",
        weight: 2,
        done: true,
        ref: "PR #120",
      },
      {
        id: "pr185-laliga",
        title:
          "PR #185: standings tests 47/47; four shared baseline failures and live extraction remain open",
        weight: 1,
        blocker: true,
        ref: "PR #185 · preview: https://punthubv2-ebq8bm0or-michael-chigbus-projects-6fad9571.vercel.app",
      },
      {
        id: "pr195-evidence",
        title:
          "PR #195: evidence tests 15/15; 13 shared baseline failures and isolated SQL review remain open",
        weight: 1,
        blocker: true,
        ref: "PR #195 · preview: https://punthubv2-lskkd1to6-michael-chigbus-projects-6fad9571.vercel.app · migration unapplied",
      },
      {
        id: "test-suite-baseline",
        title:
          "Resolve four shared baseline test failures (cron auth, archive aliases and PFIE model routing)",
        weight: 1,
        blocker: true,
        ref: "Main baseline: 13 failures; PR #185 reduces this to four",
      },
      {
        id: "pr196-postlaunch",
        title: "PR #196: post-launch match intelligence / odds / exclusions review",
        weight: 1,
        ref: "PR #196 · deferred until after MVP launch",
      },
      {
        id: "manual-odds-qa",
        title:
          "Manual bookmaker and odds submission QA; timestamp persistence and User-submitted label",
        weight: 1,
        blocker: true,
        ref: "docs/PARALLEL_ARCHITECTURE.md",
      },
      {
        id: "fixtures-volume",
        title: "Upcoming fixtures loaded (next 14 days)",
        weight: 3,
        blocker: true,
        metric: { key: "upcomingFixtures", target: 120, unit: "fixtures" },
      },
      {
        id: "history-volume",
        title: "Historical results imported (2,500 minimum)",
        weight: 3,
        blocker: true,
        metric: { key: "completedResults", target: 2500, unit: "results" },
        ref: "Live count from completed_matches; 2,500 is the minimum threshold, not a cap.",
      },
      {
        id: "standings-volume",
        title: "League tables populated",
        weight: 2,
        metric: { key: "standingsLeagues", target: 12, unit: "leagues" },
      },
      {
        id: "history-import",
        title: "Backfill this season and last season for the 12 tracked leagues (scheduled job)",
        weight: 2,
        blocker: true,
        done: true,
        ref: "PR #129",
      },
      { id: "badges-coverage", title: "Team badges for every team in tracked leagues", weight: 1 },
      {
        id: "results-verified",
        title: "Results grading checked against a live matchday",
        weight: 1,
        blocker: true,
      },
      {
        id: "odds-prematch",
        title:
          "Automated pre-match reference odds feed (post-launch only; written data rights required)",
        weight: 2,
        ref: "docs/PARALLEL_ARCHITECTURE.md",
      },
      {
        id: "team-news",
        title: "Team news and line-ups via Parallel Monitor on match cards",
        weight: 1,
        ref: "docs/PARALLEL_ARCHITECTURE.md",
      },
      {
        id: "match-stats",
        title: "Post-match stats stored for finished fixtures",
        weight: 1,
      },
      {
        id: "one-off-research",
        title: "One-off data jobs funded before the Parallel balance expires (7 Dec)",
        weight: 1,
        ref: "docs/PARALLEL_ARCHITECTURE.md",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments and monetisation",
    weight: 16,
    tasks: [
      {
        id: "annual-pass-payfast",
        title: "Annual Pass: reserve, then pay by PayFast link",
        weight: 1,
        done: true,
        ref: "PR #65, #76",
      },
      {
        id: "credit-ledger",
        title: "Credit ledger, prices and spend_credits()",
        weight: 1,
        done: true,
        ref: "PR #84",
      },
      {
        id: "payg-checkout",
        title: "Pay-As-You-Go credit packs: PayFast checkout + ITN webhook",
        weight: 4,
        blocker: true,
        done: true,
        ref: "PR #127",
      },
      {
        id: "pro-subscription",
        title: "Puntr Pro: PayFast recurring billing, renewals, cancellations",
        weight: 4,
        blocker: true,
        done: true,
        ref: "PR #130",
      },
      {
        id: "payments-sandbox",
        title: "End-to-end PayFast sandbox test (success, fail, refund, cancel)",
        weight: 2,
        blocker: true,
      },
      {
        id: "payments-legal",
        title: "Payments legal copy: Terms, Refunds, Privacy (PayFast processor), Pricing",
        weight: 2,
        blocker: true,
      },
      {
        id: "payments-go",
        title: "Owner go-ahead to switch payments on",
        weight: 1,
        blocker: true,
      },
    ],
  },
  {
    id: "ai",
    title: "AI features",
    weight: 12,
    tasks: [
      {
        id: "content-engine",
        title: "Newsroom content engine with quality gate",
        weight: 2,
        done: true,
        ref: "PR #82",
      },
      {
        id: "pfie-ai",
        title: "PFIE extraction with deterministic validation",
        weight: 2,
        done: true,
      },
      {
        id: "paid-ai-insight",
        title: "Paid AI match insight (PUNT AI) spending PAYG credits, Pro included",
        weight: 4,
        blocker: true,
      },
      {
        id: "ai-cost-guards",
        title: "Paid-tier AI quotas, model fallbacks and cost alerts",
        weight: 2,
        blocker: true,
      },
      {
        id: "ai-disclosure",
        title: "AI labels, no-advice disclaimer and legal copy for paid AI",
        weight: 2,
        blocker: true,
      },
      {
        id: "parallel-layer",
        title: "Parallel data layer: response cache, USD budgets, Task and Chat clients",
        weight: 1,
        blocker: true,
        done: true,
        ref: "docs/PARALLEL_ARCHITECTURE.md",
      },
      {
        id: "confidence-score",
        title: "Confidence Score model and Deep Analysis drawer on real data",
        weight: 3,
        blocker: true,
      },
      {
        id: "punt-ai-chat",
        title: "Punt AI chatbot: conversational analysis on Puntr data, live web for paid members",
        weight: 3,
        blocker: true,
      },
    ],
  },
  {
    id: "pwa",
    title: "PWA and mobile",
    weight: 8,
    tasks: [
      {
        id: "mobile-dock",
        title: "Scroll-aware mobile dock and flyouts",
        weight: 1,
        done: true,
        ref: "PR #121",
      },
      {
        id: "pwa-manifest",
        title: "Web app manifest, icons, theme colour, install name",
        weight: 2,
        blocker: true,
      },
      {
        id: "pwa-sw",
        title: "Service worker: offline shell, safe caching (no private data cached)",
        weight: 2,
        blocker: true,
      },
      {
        id: "pwa-install",
        title: "Install prompt (Android) and Add to Home Screen guide (iOS)",
        weight: 1,
      },
      {
        id: "pwa-lighthouse",
        title: "Lighthouse PWA and mobile performance pass on a real phone",
        weight: 2,
      },
    ],
  },
  {
    id: "trust",
    title: "Trust, safety and compliance",
    weight: 12,
    tasks: [
      {
        id: "rg-18",
        title: "18+ attestation, RG notice and 0800 006 008 sitewide",
        weight: 2,
        done: true,
      },
      { id: "legal-pages", title: "Terms, Privacy, Cookies aligned (r18)", weight: 2, done: true },
      { id: "mfa", title: "MFA enforcement for accounts with a factor", weight: 1, done: true },
      {
        id: "economics",
        title: "PuntPoints economics: caps, velocity limits, collusion checks (21-23 Nov)",
        weight: 3,
        blocker: true,
        ref: "docs/PUNTPOINTS_ECONOMICS_PLAN.md",
      },
      {
        id: "counsel",
        title: "Counsel review of open [attorney review] items",
        weight: 2,
        blocker: true,
        ref: "docs/legal-changelog.md",
      },
      { id: "db-hardening", title: "Database advisor warnings cleared", weight: 1, blocker: true },
      {
        id: "unsubscribe",
        title: "Unsubscribe link on every marketing broadcast",
        weight: 1,
        blocker: true,
      },
    ],
  },
  {
    id: "ops",
    title: "Platform operations",
    weight: 8,
    tasks: [
      {
        id: "quotas",
        title: "API quotas and rate limits on every provider",
        weight: 2,
        done: true,
      },
      {
        id: "admin-portal",
        title: "Admin portal: users, newsroom, analytics, action log",
        weight: 2,
        done: true,
      },
      {
        id: "ci-checks",
        title: "Lint, typecheck, tests and build on every PR",
        weight: 1,
        done: true,
      },
      {
        id: "cron-monitoring",
        title: "Cron failure alerts (fixtures, results, tables, emails)",
        weight: 1,
        blocker: true,
      },
      {
        id: "follow-ups",
        title: "Minor follow-ups: types.ts regen, quest_award, duel-stakes upsert",
        weight: 1,
      },
      {
        id: "launch-runbook",
        title: "Launch-day runbook: copy flip, gate open, smoke tests, rollback",
        weight: 1,
        blocker: true,
        ref: "docs/launch-day-copy.md",
      },
    ],
  },
  {
    id: "gtm",
    title: "Go-to-market: early user acquisition",
    weight: 12,
    tasks: [
      {
        id: "founding-100",
        title: "Founding Members before launch",
        weight: 5,
        blocker: true,
        metric: { key: "foundingMembers", target: 100, unit: "members" },
      },
      {
        id: "passes-20",
        title: "Founding Annual Passes taken",
        weight: 2,
        metric: { key: "annualPasses", target: 20, unit: "passes" },
      },
      {
        id: "email-sequence",
        title: "Founding email sequence and launch notifications",
        weight: 1,
        done: true,
      },
      { id: "creators", title: "Three creator or fan-channel partnerships confirmed", weight: 2 },
      {
        id: "affiliate-live",
        title: "First licensed bookmaker partner live (licence check recorded)",
        weight: 1,
      },
      {
        id: "launch-campaign",
        title: "Launch-week campaign ready (posts, emails, 250-member 30-day plan)",
        weight: 1,
        blocker: true,
      },
    ],
  },
];

export type Metrics = Partial<Record<MetricKey, number | null>>;
export type StoredState = Record<string, { done: boolean; updatedAt?: string | null }>;

export type ReadinessSnapshot = {
  state: StoredState;
  metrics: Metrics;
  /** False when the state table could not be read (catalogue defaults shown, ticking disabled). */
  stateAvailable: boolean;
  readAt: string;
};

export type ScoredTask = ReadinessTask & {
  progress: number;
  isDone: boolean;
  value: number | null;
  updatedAt: string | null;
};

export type ScoredWorkstream = Omit<Workstream, "tasks"> & {
  tasks: ScoredTask[];
  /** 0..1 */
  progress: number;
  /** Points earned out of `weight`. */
  points: number;
};

export type Readiness = {
  score: number;
  workstreams: ScoredWorkstream[];
  openBlockers: ScoredTask[];
  doneCount: number;
  totalCount: number;
};

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function scoreTask(task: ReadinessTask, state: StoredState, metrics: Metrics): ScoredTask {
  if (task.metric) {
    const raw = metrics[task.metric.key];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    const progress = value === null ? 0 : clamp01(value / task.metric.target);
    return { ...task, progress, isDone: progress >= 1, value, updatedAt: null };
  }
  const stored = state[task.id];
  const isDone = stored ? stored.done : Boolean(task.done);
  return {
    ...task,
    progress: isDone ? 1 : 0,
    isDone,
    value: null,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export function computeReadiness(
  state: StoredState = {},
  metrics: Metrics = {},
  workstreams: Workstream[] = WORKSTREAMS,
): Readiness {
  const totalWeight = workstreams.reduce((s, w) => s + w.weight, 0) || 1;
  const scored = workstreams.map((ws) => {
    const tasks = ws.tasks.map((t) => scoreTask(t, state, metrics));
    const tw = tasks.reduce((s, t) => s + t.weight, 0) || 1;
    const progress = tasks.reduce((s, t) => s + t.weight * t.progress, 0) / tw;
    return { ...ws, tasks, progress, points: (ws.weight * progress * 100) / totalWeight };
  });
  const all = scored.flatMap((w) => w.tasks);
  const score = Math.round(scored.reduce((s, w) => s + w.points, 0));
  return {
    score,
    workstreams: scored,
    openBlockers: all.filter((t) => t.blocker && !t.isDone),
    doneCount: all.filter((t) => t.isDone).length,
    totalCount: all.length,
  };
}

export const PR_TRACKER_TASK_IDS = [
  "pr185-five-source-cap",
  "pr185-focused-validation",
  "pr185-review-threads",
  "pr185-live-consensus",
  "pr185-full-suite-baseline",
  "pr195-focused-validation",
  "pr195-review-threads",
  "pr195-source-licence-guard",
  "pr195-disposable-sql",
  "pr195-prod-baseline-rollback",
  "pr196-mvp-scope-excluded",
] as const;

export const TASK_IDS: ReadonlySet<string> = new Set([
  ...WORKSTREAMS.flatMap((w) => w.tasks.filter((t) => !t.metric).map((t) => t.id)),
  ...PR_TRACKER_TASK_IDS,
]);

export function readinessVerdict(score: number, openBlockers: number): string {
  if (score >= 90 && openBlockers === 0) return "Launch ready";
  if (score >= 75) return "On track, blockers open";
  if (score >= 55) return "At risk: close the blockers first";
  return "Not ready";
}

export function daysToLaunch(now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(LAUNCH_AT) - now) / 86_400_000));
}
