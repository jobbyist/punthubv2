import type { FixtureStatus } from "./types";

/**
 * API-Football (v3) status codes. Awarded results and walkovers (AWD, WO) are treated as cancelled so the pick
 * is void rather than graded on a score that was not played.
 */
export function mapFootballStatus(short: string | null | undefined): FixtureStatus | null {
  switch (short) {
    case "TBD":
    case "NS":
      return "scheduled";
    case "1H":
    case "HT":
    case "2H":
    case "ET":
    case "BT":
    case "P":
    case "SUSP":
    case "INT":
    case "LIVE":
      return "live";
    case "FT":
    case "AET":
    case "PEN":
      return "finished";
    case "PST":
      return "postponed";
    case "ABD":
      return "abandoned";
    case "CANC":
    case "AWD":
    case "WO":
      return "cancelled";
    default:
      return null;
  }
}

/** API-Rugby (v1) status codes. */
export function mapRugbyStatus(short: string | null | undefined): FixtureStatus | null {
  switch (short) {
    case "NS":
      return "scheduled";
    case "1H":
    case "2H":
    case "HT":
    case "ET":
    case "BT":
    case "PT":
    case "SUSP":
    case "LIVE":
      return "live";
    case "FT":
    case "AET":
      return "finished";
    case "PST":
      return "postponed";
    case "ABD":
      return "abandoned";
    case "CANC":
    case "AWD":
      return "cancelled";
    default:
      return null;
  }
}
