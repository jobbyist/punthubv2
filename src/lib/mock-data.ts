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
  { name: "Betfair", logo: "/logos/betfair.png" },
  { name: "Playabets", logo: "/logos/playabets.png" },
  { name: "10bet", logo: "/logos/10bet.png" },
  { name: "Stake", logo: "/logos/stake.png" },
  { name: "Easybet", logo: "/logos/easybet.png" },
  { name: "1xBet", logo: "/logos/1xbet.png" },
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
};

export function getTeamLogo(teamName: string): string | undefined {
  return teamLogos[teamName];
}
