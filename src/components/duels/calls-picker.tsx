import { useTranslation } from "react-i18next";

import { DUEL_MARKETS, DUEL_SELECTIONS, type DuelCall, type DuelMarket } from "@/lib/duels";
import { cn } from "@/lib/utils";

/** Label for a call: team names for the match result, short words for the rest. */
export function useCallLabel(home: string, away: string) {
  const { t } = useTranslation("duels");
  return (market: DuelMarket, selection: string) =>
    market === "1X2"
      ? selection === "home"
        ? home
        : selection === "away"
          ? away
          : t("sel.draw")
      : t(`sel.${selection}`);
}

/**
 * Choose 2 or 3 markets and one selection in each. With `fixed` (accepting a duel) the markets are set and every
 * one needs a call.
 */
export function CallsPicker({
  home,
  away,
  value,
  onChange,
  fixed,
}: {
  home: string;
  away: string;
  value: DuelCall[];
  onChange: (calls: DuelCall[]) => void;
  fixed?: DuelMarket[];
}) {
  const { t } = useTranslation("duels");
  const label = useCallLabel(home, away);
  const markets = fixed ?? DUEL_MARKETS;
  const pick = (market: DuelMarket, selection: string) => {
    const current = value.find((c) => c.market === market);
    const rest = value.filter((c) => c.market !== market);
    // Tapping the chosen call again clears that market (only when markets are not fixed).
    if (current?.selection === selection && !fixed) onChange(rest);
    else if (!current && !fixed && value.length >= 3) return;
    else onChange([...rest, { market, selection }]);
  };
  return (
    <div className="space-y-3">
      {markets.map((m) => {
        const chosen = value.find((c) => c.market === m)?.selection;
        return (
          <fieldset key={m} className="rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-semibold text-muted-foreground">
              {t(`markets.${m}`)}
            </legend>
            <div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
              {DUEL_SELECTIONS[m].map((sel) => (
                <button
                  key={sel}
                  type="button"
                  aria-pressed={chosen === sel}
                  onClick={() => pick(m, sel)}
                  className={cn(
                    "min-h-10 truncate rounded-md border px-2 text-sm font-semibold transition-colors",
                    chosen === sel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary",
                  )}
                >
                  {label(m, sel)}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
