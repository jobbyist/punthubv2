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
  "Arsenal": "/teams/arsenal.svg",
  "Liverpool": "/teams/liverpool.svg",
  "Golden State Warriors": "https://puntr.co.za/teams/goldenstate.JPG",
  "Boston Celtics": "https://puntr.co.za/teams/celtics.PNG",
  "South Africa Springboks (Rugby)": "https://puntr.co.za/teams/springboks.jpg",
  "Springboks": "https://puntr.co.za/teams/springboks.jpg",
  "South Africa (Rugby)": "https://puntr.co.za/teams/springboks.jpg",
  "New Zealand All Blacks (Rugby)": "https://puntr.co.za/teams/newzealand.JPG",
  "All Blacks": "https://puntr.co.za/teams/newzealand.JPG",
  "New Zealand (Rugby)": "https://puntr.co.za/teams/newzealand.JPG",
  "South Africa (Cricket)": "https://puntr.co.za/teams/za.PNG",
  "India (Cricket)": "https://puntr.co.za/teams/india.PNG",
};

export function getTeamLogo(teamName: string): string | undefined {
  return teamLogos[teamName];
}
