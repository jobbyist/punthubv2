export type Sport = {
  name: string;
  count: number;
};

export const sports: Sport[] = [
  { name: "Football", count: 128 },
  { name: "Rugby", count: 34 },
  { name: "Basketball", count: 21 },
  { name: "Cricket", count: 18 },
  { name: "Tennis", count: 12 },
  { name: "Esports", count: 9 },
  { name: "Golf", count: 6 },
];

export const platforms = [
  "Betway",
  "Bet.co.za",
  "Sportingbet",
  "Hollywoodbets",
  "Supabets",
  "Betfair",
  "Playabets",
  "10bet",
];

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
      { league: "PSL • 15:30", match: "Orlando Pirates vs Kaizer Chiefs", pick: "Orlando Pirates", result: "2-1", odds: 1.62, ok: true },
      { league: "Premier League • 16:00", match: "Liverpool vs Arsenal", pick: "Over 2.5 Goals", result: "2-2", odds: 1.7, ok: true },
      { league: "La Liga • 17:15", match: "Barcelona vs Real Sociedad", pick: "Barcelona", result: "4-0", odds: 1.45, ok: true },
      { league: "Serie A • 19:45", match: "AC Milan vs Juventus", pick: "Draw", result: "0-0", odds: 3.25, ok: true },
      { league: "Bundesliga • 17:30", match: "Bayern Munich vs Wolfsburg", pick: "Bayern Munich", result: "2-2", odds: 1.28, ok: false },
      { league: "Ligue 1 • 21:00", match: "PSG vs Marseille", pick: "PSG", result: "1-3", odds: 1.4, ok: false },
      { league: "NBA • 21:30", match: "Lakers vs Warriors", pick: "Lakers", result: "110-112", odds: 1.8, ok: false },
      { league: "UECL • 22:00", match: "Fiorentina vs Club Brugge", pick: "Over 2.5 Goals", result: "1-1", odds: 1.85, ok: false },
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
    q: "What is PuntHub?",
    a: "PuntHub aggregates odds, markets, predictions and AI insights from South Africa's leading bookmakers into one place, and rewards you with PuntPoints for accurate predictions and community participation.",
  },
  {
    q: "How do PuntPoints work?",
    a: "You earn PuntPoints for daily logins, predictions, correct picks, community posts, streaks and referrals. Points unlock badges, ranks and real rewards like cash and free bets.",
  },
  {
    q: "How do I earn 30% recurring revenue?",
    a: "Refer users to a PuntHub Premium or PuntHub AI plan and earn 30% of their monthly subscription for as long as they remain subscribed. There is no cap on earnings.",
  },
  {
    q: "Is PuntHub free to use?",
    a: "Yes. The Free plan gives you community access, limited predictions and basic leaderboards. Premium (R99/month) and PuntHub AI (R249/month) unlock the full experience.",
  },
  {
    q: "How accurate are predictions?",
    a: "Every tipster has a public hit rate and history, and AI confidence scores are shown alongside each pick. Nothing is guaranteed — always bet responsibly.",
  },
  {
    q: "Can I withdraw my PuntPoints?",
    a: "PuntPoints can be redeemed for cash rewards, bookmaker bonuses and free bets from the Rewards page once you reach the minimum threshold.",
  },
  {
    q: "Which betting platforms are supported?",
    a: "Betway, Bet.co.za, Sportingbet, Hollywoodbets, Supabets, Betfair, Playabets and 10bet, with more being added.",
  },
];

export const communityPosts = [
  {
    author: "PuntHub Official",
    meta: "2 days ago",
    pinned: true,
    admin: true,
    title: "Welcome to the PuntHub Community! 👋",
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
