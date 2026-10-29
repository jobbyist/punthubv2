# Fixtures and results (P7)

Provider: API-Sports (API-Football v3 for soccer, API-Rugby v1 for rugby). Code in `src/lib/sports/`.

**Football only at launch.** Rugby and horse racing are added after launch, in weeks 1 to 2. `SPORTS_ENABLED` (default `soccer`) decides which sports the sync requests; rugby is switched on later with `SPORTS_ENABLED=soccer,rugby` once the API-Sports **Rugby** subscription exists (it is a separate subscription from Football). Horse racing needs its own data model and provider and is not built.

**The free API-Sports plan only serves seasons 2022 to 2024**, so a paid Football plan (Pro, about $19 a month at the time of writing) is needed for the current season. Pro's 7,500 requests a day is far more than the sync uses.

## Environment

- `SPORTS_API_KEY` (Vercel, server only).
- `CRON_SECRET` (Vercel). The same value goes into Supabase Vault (below).
- `SPORTS_LEAGUE_IDS`: JSON keyed by competition, for example `{"psl":288,"epl":39,"ucl":2}`, plus any of the other football keys (`uel`, `uecl`, `laliga`, `seriea`, `bundesliga`, `ligue1`, `facup`, `eflcup`, `nedbank`, `mtn8`, `sa-championship`, `caf-cl`, `caf-cc`, `afcon`, `wcq-caf`, `bafana-friendlies`) once you have looked up the real IDs. **IDs are never guessed in code.** Run `SPORTS_API_KEY=... bun run sports:ids` to list candidate leagues for each competition, pick the right ones, and set the variable. A competition without an ID is skipped and reported in the sync response.
- `SPORTS_ENABLED`: optional, defaults to `soccer`.
- `SUPABASE_SERVICE_ROLE_KEY` is already set for Production (it is what `client.server.ts` reads). Preview has none of the Supabase variables yet.

## Routes (GET, `Authorization: Bearer ${CRON_SECRET}`)

- `/api/cron/sync-fixtures`: yesterday to +14 days, one provider call per competition. Never overwrites a fixture that is already `finished`.
- `/api/cron/sync-results`: fixtures that kicked off in the last 36 hours and are not final. Zero provider calls when none are open; otherwise one call per competition that has open fixtures.
  Both return `{ ok, calls, upserted, skipped }` and log the same.

## Scheduling (why pg_cron, not vercel.json)

Vercel's Hobby plan only allows daily crons, and an entry running more often fails the deployment. `supabase/migrations/20261030070000_cron_schedule.sql` therefore schedules both routes with `pg_cron` + `pg_net`: fixtures daily at 02:00 UTC, results every 30 minutes. The job reads two Vault secrets; until they exist it does nothing:

```sql
select vault.create_secret('https://puntr.co.za', 'cron_base_url');
select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
```

Check runs with `select * from cron.job_run_details order by start_time desc limit 10;` and `select * from net._http_response order by created desc limit 10;`.

The build output defaults to a Cloudflare target locally, but on Vercel the Lovable preset deploys server routes as Vercel functions (the preview serves SSR pages). Confirm `/api/cron/sync-results` returns 401 without the secret on a preview.

## Scores

Soccer stores the 90-minute (full-time) score, so extra time and penalties never reach grading. Awarded results and walkovers are mapped to `cancelled` (void). Unknown provider statuses are dropped and retried on the next run.

## CSV fallback

`/admin/fixtures` (admin only, role checked on the server): `sport,competition,home,away,kickoff_at` with an ISO time and offset, e.g. `2026-11-07T17:30:00+02:00`. A bad row rejects the whole file. Re-importing the same row updates it. Moves into the /admin Fixtures tab in P11.

## Open

- League IDs and the Springbok Tests season rule (assumed calendar year) must be confirmed from the printed league list.
- Nothing here has been run against the live API: no key was available.

## Adding a league

Add a `competitions` entry (key, sport, name, season rule, search terms; `teamIncludes` keeps only matches involving a named team, used for Bafana Bafana friendlies and qualifiers). Run `SPORTS_API_KEY=... bun run sports:ids`, pick the right league, and add its ID to `SPORTS_LEAGUE_IDS`. Each league costs one fixtures call a day plus a results call only while it has open fixtures. The predictions page builds its league filter from the fixtures that are loaded, so a league appears only when it has matches.
