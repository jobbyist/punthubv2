import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchUpcomingFixtures } from "@/lib/fixtures";
import { TRACKED_COMPETITIONS } from "@/lib/match/competition-meta";
import {
  EMPTY_FAVOURITES,
  FAVOURITE_SPORTS,
  MAX_FAVOURITES,
  fetchFavourites,
  saveFavourites,
  type Favourites,
} from "@/lib/preferences";
import { competitions } from "@/lib/sports/competitions";
import { cn } from "@/lib/utils";

const SPORT_LABEL: Record<string, string> = { "horse-racing": "racing" };
const LIVE_SPORTS = new Set(["soccer"]);

/** Account section: favourite sports, competitions and teams (private; personalises the Matchday card). */
export function FavouritesEditor({ userId }: { userId: string }) {
  const { t } = useTranslation("favourites");
  const { t: tc } = useTranslation("common");
  const [fav, setFav] = useState<Favourites>(EMPTY_FAVOURITES);
  const [teams, setTeams] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetchFavourites(userId)
      .then(setFav)
      .catch((e: unknown) => console.error("favourites load failed", e));
    fetchUpcomingFixtures({ days: 14, limit: 400 })
      .then((fs) => setTeams(Array.from(new Set(fs.flatMap((f) => [f.home, f.away]))).sort()))
      .catch((e: unknown) => console.error("teams load failed", e));
  }, [userId]);

  const toggle = (field: keyof Favourites, value: string) => {
    setState("idle");
    setFav((f) => {
      const has = f[field].includes(value);
      if (!has && f[field].length >= MAX_FAVOURITES) return f;
      return { ...f, [field]: has ? f[field].filter((x) => x !== value) : [...f[field], value] };
    });
  };
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return teams.filter((x) => x.toLowerCase().includes(n) && !fav.teams.includes(x)).slice(0, 8);
  }, [q, teams, fav.teams]);

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      on ? "border-ink bg-ink text-ink-foreground" : "border-border hover:border-primary",
    );

  return (
    <section
      id="favourites"
      className="card-surface mt-6 scroll-mt-24 p-5"
      aria-labelledby="fav-title"
    >
      <h2 id="fav-title" className="text-lg">
        {t("editor.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("editor.body")}</p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("editor.sports")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {FAVOURITE_SPORTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={fav.sports.includes(s)}
              onClick={() => toggle("sports", s)}
              className={chip(fav.sports.includes(s))}
            >
              {tc(`sport.${SPORT_LABEL[s] ?? s}`)}
              {!LIVE_SPORTS.has(s) && (
                <span className="ml-1.5 text-[10px] uppercase opacity-60">{t("editor.soon")}</span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("editor.competitions")} <span className="normal-case">· {t("editor.limit")}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRACKED_COMPETITIONS.map((key) => {
            const name = competitions.find((c) => c.key === key)?.name ?? key;
            const on = fav.competitions.includes(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                aria-label={name}
                onClick={() => toggle("competitions", key)}
                className={cn(chip(on), "py-1 pl-1.5", on && "[&_span]:text-ink-foreground")}
              >
                <CompetitionBadge name={name} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("editor.teams")}
        </legend>
        {fav.teams.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {fav.teams.map((team) => (
              <li key={team}>
                <button
                  type="button"
                  onClick={() => toggle("teams", team)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                  aria-label={t("editor.remove", { name: team })}
                >
                  {team}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="fav-team-search" className="sr-only">
          {t("editor.teamsPlaceholder")}
        </label>
        <Input
          id="fav-team-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("editor.teamsPlaceholder")}
          autoComplete="off"
          disabled={fav.teams.length >= MAX_FAVOURITES}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("editor.teamsHint")}</p>
        {q.trim().length >= 2 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {matches.length === 0 ? (
              <li className="text-xs text-muted-foreground">{t("editor.noMatch")}</li>
            ) : (
              matches.map((team) => (
                <li key={team}>
                  <button
                    type="button"
                    className={chip(false)}
                    onClick={() => {
                      toggle("teams", team);
                      setQ("");
                    }}
                  >
                    + {team}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </fieldset>

      <div className="mt-6 flex items-center gap-3">
        <Button
          disabled={state === "saving"}
          onClick={() => {
            setState("saving");
            saveFavourites(userId, fav)
              .then(() => setState("saved"))
              .catch((e: unknown) => {
                console.error("favourites save failed", e);
                setState("error");
              });
          }}
        >
          {state === "saving" ? t("editor.saving") : t("editor.save")}
        </Button>
        <span role="status" className="text-sm text-muted-foreground">
          {state === "saved" ? t("editor.saved") : state === "error" ? t("editor.error") : ""}
        </span>
      </div>
    </section>
  );
}
