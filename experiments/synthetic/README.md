# Puntr synthetic QA experiment

This harness is deliberately **not** a fake-customer acquisition system. It provides 50 labelled synthetic test personas for controlled production smoke testing and isolated research evaluation.

## Production safety boundary

- Personas are data profiles only. They do not have email addresses or real identities.
- The browser runner is guest/read-only. It does not create Supabase Auth users, submit founding registrations, post public picks, earn PuntPoints, use referrals, redeem rewards, or generate campaign conversion events.
- Every browser request carries `x-puntr-synthetic-test: true` and the experiment slug.
- Browser paths are allowlisted. Do not add write endpoints to this test runner.
- Parallel forecasts are stored only in `synthetic_research`, never in public predictions or member pick tables.
- The experiment starts paused. An administrator must apply the migration, review the data/legal implications, and explicitly activate the experiment before research calls can reserve budget.
- Do not use stealth plugins, CAPTCHA bypass, proxy rotation, fingerprint spoofing, or techniques intended to evade bot detection. This is transparent QA traffic.

## Dates and budget

Experiment window: 23 November 2026 through 22 December 2026 (SAST). The migration creates a paused experiment with a hard ceiling of US$50.

**Important existing-budget constraint:** Puntr's Parallel architecture documentation says the current approximately US$50 prepaid balance expires on 7 December 2026 and is shared with production fixtures, results, standings, newsroom and other existing workloads. The 30-day experiment extends beyond that expiry. Do not assume the same prepaid balance funds the entire window; verify the live Parallel balance and reserve, and pause the experiment on 7 December unless a new budget is confirmed.

The Responses API price varies by processor/effort and the current published range is materially higher than the former Chat API estimate. This harness reserves US$0.25 per Responses request, the configured upper bound for this experiment, and counts the reservation against the cap even when the provider does not return an exact charge. It therefore stops conservatively. Do not increase this reserve without checking the live pricing page.

## Install

From this directory:

```bash
npm install
npx playwright install chromium
```

Set environment variables in your shell or CI secret store. Never commit them:

```bash
PUNTR_BASE_URL=https://your-confirmed-production-host
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SYNTHETIC_EXPERIMENT_ID=...
PARALLEL_API_KEY=...
```

The production hostname is intentionally not hard-coded. Use the exact canonical Puntr production URL. The Parallel key remains server-side in Vercel; the runner only calls the cron-authenticated Puntr endpoint.

## Browser QA

Run one to three concurrent browser contexts; the config clamps concurrency to 3. For a single staggered batch, the batch runner selects the least-recently-tested personas (round-robin) and records their last-run time:

```bash
SYNTHETIC_WORKERS=1 npm test
npm run batch -- --count=2
SYNTHETIC_WORKERS=3 npm test
PW_HEADLESS=false SYNTHETIC_WORKERS=1 npm test
SYNTHETIC_PERSONA_IDS=puntr-synth-01,puntr-synth-02 npm test
```

The browser suite only visits the public allowlisted pages in each persona's journey. It does not submit forms. It records session metadata in the isolated experiment table when the service-role variables and experiment ID are provided.

## Parallel structured decisions and research

For the 50 persona forecasts, use the Parallel Decisions API first. One request supports up to 100 named questions against one shared evidence set and returns typed choice probabilities plus citations. This is substantially cheaper than one Responses request per persona. The harness submits one question per persona for a fixture and caches the shared result.

The legacy Chat API quickstart now redirects to the Responses API. Puntr's existing server-side Parallel integration already includes Responses and Task clients. The synthetic Decisions endpoint uses the existing Puntr quota guard and parallel_cache; it does not make direct client-side calls or expose the provider key. Task API is **not required merely to obtain structured choices**; use it only for deeper asynchronous research or batch task groups.

Provide a fixture context JSON file (no personal data):

```json
{
  "fixture_id": "provider-fixture-id",
  "home_team": "Home FC",
  "away_team": "Away FC",
  "competition": "Premier League",
  "kickoff_utc": "2026-12-01T19:00:00Z"
}
```

Then:

```bash
node decisions.mjs ./fixture.json
# Optional: richer narrative research for one fixture (higher per-request cost)
node research.mjs ./fixture.json
```

Decisions are cached through Puntr's existing parallel_cache by request body (24-hour research TTL), shared across the persona batch, and never written to public picks. Each persona receives a typed market selection, option probabilities and a confidence band derived from the selected probability. An actionable batch requires at least two independent source domains; otherwise all decisions become no_pick. No odds, bookmaker or stake recommendations are generated.

## 30-day orchestration

Use an external scheduler or manually dispatched CI workflow to select 1–3 persona IDs per batch. Keep the scheduler disabled until:
1. the migration is reviewed and applied;
2. the experiment row is explicitly changed from `paused` to `active`;
3. the production hostname is confirmed;
4. the live Parallel balance and existing production reserve are checked;
5. the browser marker and analytics exclusion approach are verified.

The current app analytics helper only emits events after analytics consent. Keep the synthetic browser suite in guest mode and do not grant analytics consent. Do not add synthetic sessions to public acquisition metrics.

## Suggested phases

- 23–30 Nov: public routes, founding page rendering, fixture/results navigation and smoke QA.
- 1 Dec: launch-day regression smoke tests, one to three personas per batch.
- 2–22 Dec: repeat public-route checks and forecast evaluation; no public engagement writes.

## Operational controls

- Stop on any 5xx response, unexpected redirect, missing page, budget reservation failure or database error.
- Keep Playwright workers at 1 by default; maximum 3.
- One Parallel research request per unique fixture, not per persona. Cache and reuse it.
- Keep the experiment paused if the remaining provider budget is uncertain.
- No automatic wagering or real-money transactions.
