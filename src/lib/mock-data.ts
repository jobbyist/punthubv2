/** Static reference data only (sport list, partner logos, team logos). The sample picks, tipsters and results are gone. */
export type Sport = {
  name: string;
  active: boolean;
};

export const sports: Sport[] = [
  { name: "Soccer", active: true },
  { name: "Rugby", active: false },
  { name: "Basketball", active: false },
  { name: "Tennis", active: false },
  { name: "Cricket", active: false },
  { name: "Combat sports", active: false },
  { name: "Athletics", active: false },
  { name: "Horse racing", active: false },
];

export type Platform = {
  name: string;
  logo: string;
};

export const platforms: Platform[] = [
  { name: "Betway", logo: "/logos/betway.png" },
  { name: "Bet.co.za", logo: "/logos/bet-co-za.png" },
  { name: "Sportingbet", logo: "/logos/sportingbet.png" },
  { name: "Hollywoodbets", logo: "/logos/hollywoodbets.png" },
  { name: "Supabets", logo: "/logos/supabets.png" },
  { name: "Playabets", logo: "/logos/playabets.png" },
  { name: "10bet", logo: "/logos/10bet.png" },
  { name: "Easybet", logo: "/logos/easybet.png" },
  { name: "WorldSportsBetting", logo: "/logos/wsb.PNG" },
];

export type TeamLogo = {
  name: string;
  logo: string;
};

export const teamLogos: Record<string, string> = {
  "Orlando Pirates": "/teams/orlando.png",
  "Kaizer Chiefs": "/teams/kaizer.jpg",
  "Real Madrid": "/teams/realmadrid.png",
  "Bayern Munich": "/teams/bayernmunich.png",
  Arsenal: "/teams/arsenal.svg",
  Liverpool: "/teams/liverpool.svg",
  "Golden State Warriors": "/teams/goldenstate.jpg",
  "Boston Celtics": "/teams/celtics.png",
  "South Africa Springboks (Rugby)": "/teams/springboks.jpg",
  Springboks: "/teams/springboks.jpg",
  "South Africa (Rugby)": "/teams/springboks.jpg",
  "New Zealand All Blacks (Rugby)": "/teams/allblacks.jpg",
  "All Blacks": "/teams/allblacks.jpg",
  "New Zealand (Rugby)": "/teams/allblacks.jpg",
  "South Africa (Cricket)": "/teams/southafrica.png",
  "India (Cricket)": "/teams/india.png",
};

const SPORT_SUFFIX: Record<string, string> = { rugby: "Rugby", cricket: "Cricket" };

/**
 * Logo for a team. National sides share names across sports ("South Africa" plays rugby and cricket), so
 * pass the sport to pick the right badge; it looks up "South Africa (Rugby)" when the plain name has none.
 */
export function getTeamLogo(teamName: string, sport?: string): string | undefined {
  const suffix = sport ? SPORT_SUFFIX[sport.toLowerCase()] : undefined;
  if (suffix) {
    const qualified = teamLogos[`${teamName} (${suffix})`];
    if (qualified) return qualified;
  }
  return teamLogos[teamName];
}
