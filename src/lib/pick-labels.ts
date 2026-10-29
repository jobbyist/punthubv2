import type { TFunction } from "i18next";

import { signedLine, type Market } from "@/lib/picks";

/** The translator for the "match" namespace. */
type T = TFunction<"match">;

export interface LabelPick {
  market: string;
  selection: string;
  line: number | null;
}

export interface LabelTeams {
  home: string;
  away: string;
}

/** The human wording for a pick, using the team names. Handicap lines are applied to the home team. */
export function selectionLabel(t: T, pick: LabelPick, teams: LabelTeams): string {
  const { selection, market } = pick;
  switch (market as Market) {
    case "1X2":
      return selection === "home"
        ? teams.home
        : selection === "away"
          ? teams.away
          : t("selection.draw");
    case "DC":
      return selection === "1X"
        ? t("selection.homeOrDraw", { home: teams.home })
        : selection === "X2"
          ? t("selection.drawOrAway", { away: teams.away })
          : t("selection.homeOrAway", { home: teams.home, away: teams.away });
    case "OU25":
      return selection === "over" ? t("selection.over") : t("selection.under");
    case "BTTS":
      return selection === "yes" ? t("selection.yes") : t("selection.no");
    case "HCP": {
      const line = pick.line ?? 0;
      return selection === "home"
        ? t("selection.handicap", { team: teams.home, line: signedLine(line) })
        : t("selection.handicap", { team: teams.away, line: signedLine(-line) });
    }
    default:
      return selection;
  }
}
