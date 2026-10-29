/**
 * bun run sports:ids
 * Prints candidate leagues from API-Sports for each launch competition so you can choose the right IDs.
 * Nothing is guessed: copy the chosen IDs into SPORTS_LEAGUE_IDS, e.g. {"psl":123,"epl":456,"ucl":789,"urc":1,"springbok-tests":2}.
 * Needs SPORTS_API_KEY in the environment. Uses up to a few calls per competition from the daily free quota.
 */
import { competitions } from "../src/lib/sports/competitions";

const key = process.env["SPORTS_API_KEY"];
if (!key) {
  console.error("Set SPORTS_API_KEY first.");
  process.exit(1);
}

const BASE = {
  soccer: "https://v3.football.api-sports.io",
  rugby: "https://v1.rugby.api-sports.io",
} as const;

for (const comp of competitions) {
  console.log(`\n== ${comp.key}: ${comp.name} (${comp.sport})`);
  for (const term of comp.searches) {
    const url = new URL("/leagues", BASE[comp.sport]);
    url.searchParams.set("search", term);
    const res = await fetch(url, { headers: { "x-apisports-key": key } });
    type Item = {
      league?: { id: number; name: string };
      country?: { name?: string };
      id?: number;
      name?: string;
    };
    const body = (await res.json()) as { response?: Item[] };
    for (const item of body.response ?? []) {
      // API-Football nests the league and country; API-Rugby is flat.
      const league = item.league ?? { id: item.id ?? 0, name: item.name ?? "" };
      const country = item.country?.name ?? "";
      console.log(`  search "${term}": id=${league.id}  ${league.name}  ${country}`);
    }
  }
}
