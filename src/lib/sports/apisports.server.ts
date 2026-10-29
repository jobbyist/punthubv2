import { competitions, parseLeagueIds, seasonFor, type Competition } from "./competitions";
import { normaliseFootball, normaliseRugby, PROVIDER } from "./apisports.normalise";
import type { ListOptions, ListResult, SportsProvider } from "./provider";
import type { NormalisedFixture } from "./types";

const FOOTBALL_BASE = "https://v3.football.api-sports.io";
const RUGBY_BASE = "https://v1.rugby.api-sports.io";

const day = (d: Date) => d.toISOString().slice(0, 10);

interface ApiEnvelope<T> {
  errors?: unknown;
  response?: T[];
}

/**
 * API-Sports: API-Football v3 for soccer, API-Rugby v1 for rugby.
 * The key is read from SPORTS_API_KEY on the server only. League IDs come from SPORTS_LEAGUE_IDS and are never guessed.
 */
export class ApiSportsProvider implements SportsProvider {
  readonly name = PROVIDER;
  private calls = 0;

  constructor(
    private readonly apiKey: string,
    private readonly leagueIds = parseLeagueIds(process.env["SPORTS_LEAGUE_IDS"]),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async get<T>(
    base: string,
    path: string,
    params: Record<string, string | number>,
  ): Promise<T[]> {
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    this.calls += 1;
    const res = await this.fetchImpl(url, { headers: { "x-apisports-key": this.apiKey } });
    if (!res.ok) throw new Error(`API-Sports ${res.status} for ${path}`);
    const body = (await res.json()) as ApiEnvelope<T>;
    const errors = body.errors;
    const hasErrors = Array.isArray(errors)
      ? errors.length > 0
      : errors && Object.keys(errors as object).length > 0;
    if (hasErrors) throw new Error(`API-Sports error for ${path}: ${JSON.stringify(errors)}`);
    return body.response ?? [];
  }

  private async fetchCompetition(
    comp: Competition,
    leagueId: number,
    from: Date,
    to: Date,
  ): Promise<NormalisedFixture[]> {
    const season = seasonFor(comp.seasonRule, from);
    if (comp.sport === "soccer") {
      const items = await this.get<Parameters<typeof normaliseFootball>[0]>(
        FOOTBALL_BASE,
        "/fixtures",
        {
          league: leagueId,
          season,
          from: day(from),
          to: day(to),
          timezone: "Africa/Johannesburg",
        },
      );
      return items
        .map((i) => normaliseFootball(i, comp))
        .filter((f): f is NormalisedFixture => !!f);
    }
    // API-Rugby has no date range, so one call fetches the league season and we filter by kick-off here.
    const items = await this.get<Parameters<typeof normaliseRugby>[0]>(RUGBY_BASE, "/games", {
      league: leagueId,
      season,
      timezone: "Africa/Johannesburg",
    });
    const start = Date.parse(`${day(from)}T00:00:00Z`);
    const end = Date.parse(`${day(to)}T23:59:59Z`);
    return items
      .map((i) => normaliseRugby(i, comp))
      .filter(
        (f): f is NormalisedFixture =>
          !!f && Date.parse(f.kickoffAt) >= start && Date.parse(f.kickoffAt) <= end,
      );
  }

  async listFixtures(from: Date, to: Date, opts: ListOptions = {}): Promise<ListResult> {
    this.calls = 0;
    const fixtures: NormalisedFixture[] = [];
    const skipped: ListResult["skipped"] = [];
    for (const comp of competitions) {
      if (opts.only && !opts.only.includes(comp.key)) continue;
      const leagueId = this.leagueIds[comp.key];
      if (!leagueId) {
        skipped.push({
          key: comp.key,
          reason: "no league ID in SPORTS_LEAGUE_IDS (run bun run sports:ids)",
        });
        continue;
      }
      try {
        fixtures.push(...(await this.fetchCompetition(comp, leagueId, from, to)));
      } catch (error) {
        skipped.push({
          key: comp.key,
          reason: error instanceof Error ? error.message : "request failed",
        });
      }
    }
    return { fixtures, calls: this.calls, skipped };
  }

  async listResults(from: Date, to: Date, opts: ListOptions = {}): Promise<ListResult> {
    const out = await this.listFixtures(from, to, opts);
    return { ...out, fixtures: out.fixtures.filter((f) => f.status !== "scheduled") };
  }
}

export function createProvider(): ApiSportsProvider | null {
  const key = process.env["SPORTS_API_KEY"];
  return key ? new ApiSportsProvider(key) : null;
}
