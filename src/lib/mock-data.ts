export type Sport = {
  name: string;
  active: boolean;
};

export const sports: Sport[] = [
  { name: "Soccer", active: true },
  { name: "Rugby", active: true },
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

export const topTipsters = [
  { rank: 1, name: "TipMaster87", points: 12450, hitRate: 68, correct: "65/96", streak: 18 },
  { rank: 2, name: "SoccerKingZA", points: 9230, hitRate: 64, correct: "55/86", streak: 12 },
  { rank: 3, name: "BetwiseSam", points: 8110, hitRate: 66, correct: "50/76", streak: 14 },
  { rank: 4, name: "RugbyGuru", points: 6780, hitRate: 61, correct: "41/67", streak: 9 },
  { rank: 5, name: "QueenOfPicks", points: 5420, hitRate: 63, correct: "38/60", streak: 10 },
  { rank: 6, name: "GoalHunter", points: 4870, hitRate: 60, correct: "36/60", streak: 7 },
  { rank: 7, name: "StatsWizard", points: 4260, hitRate: 58, correct: "33/57", streak: 6 },
  { rank: 8, name: "FootyFanatic", points: 3890, hitRate: 57, correct: "29/51", streak: 5 },
  { rank: 9, name: "SharpShooter", points: 3450, hitRate: 59, correct: "29/49", streak: 8 },
  { rank: 10, name: "ValueBetsZA", points: 3120, hitRate: 56, correct: "28/50", streak: 4 },
];

export const featuredPredictions = [
  {
    league: "PSL",
    kickoff: "Today, 15:30",
    home: "Orlando Pirates",
    away: "Kaizer Chiefs",
    pick: "Orlando Pirates",
    market: "Win or Draw (1X)",
    odds: 1.62,
    confidence: 78,
    tipster: "SoccerKingZA",
    badge: "Top 2%",
    backed: 1248,
  },
  {
    league: "UEFA CL",
    kickoff: "Tonight, 21:00",
    home: "Real Madrid",
    away: "Bayern Munich",
    pick: "Over 2.5 Goals",
    market: "Over/Under",
    odds: 1.75,
    confidence: 74,
    tipster: "TipMaster87",
    badge: "Top 1%",
    backed: 932,
  },
  {
    league: "URC",
    kickoff: "Tomorrow, 17:15",
    home: "Bulls",
    away: "Stormers",
    pick: "Bulls -6.5 (Handicap)",
    market: "Handicap",
    odds: 1.9,
    confidence: 71,
    tipster: "RugbyGuru",
    badge: "Top 5%",
    backed: 615,
  },
];

export const popularPredictions = [
  {
    league: "PSL • Today, 15:30",
    match: "Orlando Pirates vs Kaizer Chiefs",
    market: "1X2",
    tip: "Orlando Pirates",
    odds: 2.15,
    conf: 78,
    backed: "1.2k",
  },
  {
    league: "UEFA CL • Tonight, 21:00",
    match: "Arsenal vs PSG",
    market: "Over/Under",
    tip: "Over 2.5 Goals",
    odds: 1.7,
    conf: 74,
    backed: "982",
  },
  {
    league: "La Liga • Tonight, 22:00",
    match: "Barcelona vs Real Sociedad",
    market: "1X2",
    tip: "Barcelona",
    odds: 1.45,
    conf: 72,
    backed: "875",
  },
  {
    league: "Premier League • Tomorrow, 14:30",
    match: "Man City vs Newcastle",
    market: "Both Teams to Score",
    tip: "Yes",
    odds: 1.6,
    conf: 70,
    backed: "731",
  },
  {
    league: "SA20 • Tomorrow, 18:00",
    match: "Joburg Super Kings vs MI Cape Town",
    market: "Winner",
    tip: "Joburg Super Kings",
    odds: 1.85,
    conf: 69,
    backed: "642",
  },
];

export const resultsByDate = [
  {
    date: "Sunday, 11 May 2025",
    correct: 8,
    incorrect: 4,
    points: 420,
    matches: [
      {
        league: "PSL • 15:30",
        match: "Orlando Pirates vs Kaizer Chiefs",
        pick: "Orlando Pirates",
        result: "2-1",
        odds: 1.62,
        ok: true,
      },
      {
        league: "Premier League • 16:00",
        match: "Liverpool vs Arsenal",
        pick: "Over 2.5 Goals",
        result: "2-2",
        odds: 1.7,
        ok: true,
      },
      {
        league: "La Liga • 17:15",
        match: "Barcelona vs Real Sociedad",
        pick: "Barcelona",
        result: "4-0",
        odds: 1.45,
        ok: true,
      },
      {
        league: "Serie A • 19:45",
        match: "AC Milan vs Juventus",
        pick: "Draw",
        result: "0-0",
        odds: 3.25,
        ok: true,
      },
      {
        league: "Bundesliga • 17:30",
        match: "Bayern Munich vs Wolfsburg",
        pick: "Bayern Munich",
        result: "2-2",
        odds: 1.28,
        ok: false,
      },
      {
        league: "Ligue 1 • 21:00",
        match: "PSG vs Marseille",
        pick: "PSG",
        result: "1-3",
        odds: 1.4,
        ok: false,
      },
      {
        league: "NBA • 21:30",
        match: "Lakers vs Warriors",
        pick: "Lakers",
        result: "110-112",
        odds: 1.8,
        ok: false,
      },
      {
        league: "UECL • 22:00",
        match: "Fiorentina vs Club Brugge",
        pick: "Over 2.5 Goals",
        result: "1-1",
        odds: 1.85,
        ok: false,
      },
    ],
  },
];

export const resultsSummary = [
  { date: "Saturday, 10 May 2025", matches: 10, correct: 6, incorrect: 4, points: 320 },
  { date: "Friday, 9 May 2025", matches: 11, correct: 7, incorrect: 4, points: 350 },
  { date: "Thursday, 8 May 2025", matches: 9, correct: 6, incorrect: 3, points: 190 },
];

export const liveNow = [
  { league: "PSL", home: "Chippa Utd", away: "Kaizer Chiefs", hs: 1, as: 2 },
  { league: "URC", home: "Bulls", away: "Stormers", hs: 17, as: 15 },
  { league: "NBA", home: "Lakers", away: "Warriors", hs: 110, as: 112 },
];

export const marketMovers = [
  { title: "Over 2.5 Goals", sub: "Orlando Pirates vs Kaizer Chiefs", change: 12 },
  { title: "Bulls -6.5 Handicap", sub: "Bulls vs Stormers", change: 9 },
  { title: "Real Madrid Win", sub: "Real Madrid vs Bayern Munich", change: 8 },
];

export const sparkline = [12, 18, 14, 22, 19, 26, 24, 30, 27, 34, 31, 38];

export const faqs = [
  {
    q: "What is Puntr?",
    a: "Puntr is a place to post sports predictions that are locked at kick-off, graded automatically and kept as a public record, so you can build a track record people can trust.",
  },
  {
    q: "How do PuntPoints work?",
    a: "PuntPoints are leaderboard points for activity and settled picks. They have no cash value and cannot be exchanged for money.",
  },
  {
    q: "Can I invite friends?",
    a: "Yes. Founding Members get a personal invite link. Invites move friends up the waitlist. There are no payments for referrals.",
  },
  {
    q: "Is Puntr free to use?",
    a: "Yes. Puntr is free during the Founding 100 launch. Any paid features later will be announced first and never switched on without notice.",
  },
  {
    q: "How accurate are predictions?",
    a: "Every tipster has a public record with units, ROI and sample size. Past results do not predict future results. Bet responsibly: 0800 006 008.",
  },
  {
    q: "Can I withdraw my PuntPoints?",
    a: "No. PuntPoints have no monetary value and cannot be withdrawn or exchanged for cash.",
  },
  {
    q: "Does Puntr take bets?",
    a: "No. Puntr does not accept bets, set odds or handle winnings. It is a place to record and review predictions.",
  },
];

export const communityPosts = [
  {
    author: "Puntr Official",
    meta: "2 days ago",
    pinned: true,
    admin: true,
    title: "Welcome to the Puntr Community! 👋",
    body: "Share your picks, discuss matches, and learn from the best. Remember to bet responsibly and respect every member. Let's build the most helpful betting community in SA! 💚",
    likes: 124,
    comments: 32,
  },
  {
    author: "TipMaster87",
    meta: "1 hour ago",
    tag: "Top Predictor",
    body: "What a game! Orlando Pirates showed real character today. Onto the next one! 💪",
    score: { home: "Orlando Pirates", away: "Kaizer Chiefs", hs: 2, as: 1 },
    likes: 45,
    comments: 18,
  },
  {
    author: "SoccerKingZA",
    meta: "3 hours ago",
    tag: "Won Tip",
    body: "This Over 2.5 landed perfectly! 💥 Data never lies.",
    score: { home: "Real Madrid", away: "Bayern Munich", hs: 2, as: 2 },
    likes: 82,
    comments: 9,
  },
  {
    author: "BetwiseSam",
    meta: "5 hours ago",
    body: "Here's my acca for tonight. What do you guys think?",
    acca: [
      { name: "Man City to Win", odds: 1.4 },
      { name: "Over 2.5 Goals", odds: 1.65 },
      { name: "Both Teams to Score", odds: 1.7 },
      { name: "PSG to Win", odds: 1.5 },
    ],
    total: 5.94,
    likes: 28,
    comments: 24,
  },
];
