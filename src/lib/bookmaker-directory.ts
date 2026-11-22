export type BookmakerListing = {
  name: string;
  licenceHolder: string;
  regulator: string;
  province: string;
  licenceReference: string;
  verificationNote?: string;
};

export const NGB_REGISTER_URL = "https://www.ngb.org.za/verified-operators/";

/**
 * Curated bookmaker entries transcribed from the National Gambling Board's
 * Verified Operators register. Trading names are shown where the register
 * identifies them; otherwise the licence-holder name is retained.
 * Refresh against the live register before promoting or monetising any listing.
 */
export const bookmakerDirectory: BookmakerListing[] = [
  { name: "10Bet", licenceHolder: "Not specified in NGB register", regulator: "Mpumalanga Economic Regulator", province: "Mpumalanga", licenceReference: "9-2-1-09661" },
  { name: "Apex Bets", licenceHolder: "Letsbet (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10194002-002" },
  { name: "BET.co.za", licenceHolder: "Betcoza Online (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10145732-017 (NGB register)", verificationNote: "The operator's published website states 10145732-016 for its Western Cape licence. This differs from the NGB register snapshot. Confirm the current reference with the WCGRB before relying on it." },
  { name: "BetJets", licenceHolder: "Betjets (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10091157-111" },
  { name: "Betway", licenceHolder: "Raging River Trading (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10181496-012" },
  { name: "BetXchange", licenceHolder: "BetXchange Western Cape (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10180408-012" },
  { name: "Boss Bets", licenceHolder: "Big Daddy Boss Bets (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10179821-013" },
  { name: "Bravobet", licenceHolder: "AJ Tattersalls (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10010857-030" },
  { name: "Betshezi", licenceHolder: "SMP Gaming (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10191121-004" },
  { name: "BetOlimp", licenceHolder: "Olimp (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10138042-020" },
  { name: "Easybet", licenceHolder: "Easybet Group (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10191733-004" },
  { name: "Fanbets", licenceHolder: "GameOn Gaming (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10191420-004" },
  { name: "G-Bets", licenceHolder: "Dymanex (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10179096-014" },
  { name: "Gameland", licenceHolder: "Gameland (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10195520-001" },
  { name: "GV Bet", licenceHolder: "GV International (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10192366-003" },
  { name: "Hollywoodbets", licenceHolder: "Hollywood Sportsbook Western Cape (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10110547-021" },
  { name: "Interbet", licenceHolder: "Interbet International (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10083472-023" },
  { name: "Jabula Bets", licenceHolder: "Jabula Bets (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10190511-005" },
  { name: "King Bets", licenceHolder: "King Bets (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10181847-012" },
  { name: "Lottoland", licenceHolder: "Lottoland South Africa (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10185705-009" },
  { name: "Lulabets", licenceHolder: "Lula Bets (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10190073-005" },
  { name: "Lucky Fish", licenceHolder: "Race Coast Western Cape (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10192071-003" },
  { name: "Lotto247", licenceHolder: "Jackpotstar 777 (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10189543-006" },
  { name: "MBET", licenceHolder: "MBET International (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10189800-005" },
  { name: "Neo.Bet", licenceHolder: "Greenvest Betting (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10195102-001" },
  { name: "OneBet", licenceHolder: "OneBet (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10191934-003" },
  { name: "Pantherbet", licenceHolder: "Ubuntu Quantum (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10194613-001" },
  { name: "Play.co.za", licenceHolder: "Betflash (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10172287-015" },
  { name: "Playabets", licenceHolder: "Playabets WC (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10141335-018" },
  { name: "PlayTsogo", licenceHolder: "Play Tsogo (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10190075-005" },
  { name: "Sportland", licenceHolder: "Sportland (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10195524-001" },
  { name: "SportPesa", licenceHolder: "Sportpesa (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10183090-010" },
  { name: "Sportingbet SA", licenceHolder: "Greatodds (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10125193-019" },
  { name: "SportyBet", licenceHolder: "Not specified in NGB register", regulator: "Mpumalanga Economic Regulator", province: "Mpumalanga", licenceReference: "9-2-1-09799" },
  { name: "SunBet", licenceHolder: "SunBet (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10138713-018" },
  { name: "SupaBets", licenceHolder: "Not specified in NGB register", regulator: "Free State Gambling and Liquor Authority", province: "Free State", licenceReference: "FSGLA/BML/002" },
  { name: "SuperSportBet", licenceHolder: "SuperSportBet (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10191097-004" },
  { name: "SwiftySports", licenceHolder: "Swifty Africa (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10193252-002" },
  { name: "Topbet SA", licenceHolder: "Hatsy (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10190445-005" },
  { name: "Vegas Bets", licenceHolder: "Somerset West Tattersalls CC", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10010453-029" },
  { name: "World Sports Betting", licenceHolder: "SWB Solutions (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10181495-013" },
  { name: "YesPlay", licenceHolder: "SA Sportsbook (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10180204-013" },
  { name: "ZARbet", licenceHolder: "Apollo Gaming 2024 (Pty) Ltd", regulator: "Western Cape Gambling and Racing Board", province: "Western Cape", licenceReference: "10010581-030" },
];
