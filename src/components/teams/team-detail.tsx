import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, ShieldCheck, Table2, TrendingUp, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { FollowButton } from "@/components/teams/follow-button";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { computeForms, fetchFinishedFor, type FormEntry } from "@/lib/match/form";
import type { DirectoryTeam } from "@/lib/teams/directory";
import type { useTeamFollows } from "@/lib/teams/follows";
import { cn } from "@/lib/utils";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** Team crest on a white disc, large. Falls back to initials. */
export function TeamCrest({
  team,
  size = 64,
  className,
}: {
  team: Pick<DirectoryTeam, "name" | "badge">;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (team.badge)
    return (
      <img
        src={team.badge}
        alt={`${team.name} logo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={style}
        className={cn(
          "shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-border",
          className,
        )}
      />
    );
  const initials = team.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      style={style}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-muted font-display font-extrabold text-muted-foreground ring-1 ring-border",
        className,
      )}
      aria-label={team.name}
    >
      {initials}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export { ordinal };

/** Everything about one team: used in the directory modal and on /teams/$slug. */
export function TeamDetail({
  team,
  follows,
  followers,
  source,
  showPageLink = false,
}: {
  team: DirectoryTeam;
  follows: ReturnType<typeof useTeamFollows>;
  followers: number | undefined;
  source: string;
  showPageLink?: boolean;
}) {
  const { t } = useTranslation("teams");
  const reduce = useReducedMotion();
  const [form, setForm] = useState<FormEntry[] | null>(null);

  useEffect(() => {
    let live = true;
    setForm(null);
    fetchFinishedFor([team.name], 40)
      .then((rows) => {
        if (live) setForm(computeForms(rows, [team.name], 5)[team.name]?.entries ?? []);
      })
      .catch(() => live && setForm([]));
    return () => {
      live = false;
    };
  }, [team.name]);

  const s = team.standing;
  const section = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.08 + i * 0.06, ease: EASE },
        };

  return (
    <div className="space-y-5">
      <motion.header {...section(0)} className="flex items-center gap-4">
        <motion.div
          initial={reduce ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <TeamCrest team={team} size={72} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl leading-tight">{team.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {s && (
              <span>
                {t("card.position", { pos: ordinal(s.position), competition: s.competition })}
              </span>
            )}
            {followers !== undefined && followers >= 3 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden="true" />
                {t("followers", { count: followers })}
              </span>
            )}
          </p>
        </div>
      </motion.header>

      <motion.div {...section(1)} className="flex flex-wrap items-center gap-2">
        <FollowButton team={team} follows={follows} source={source} size="md" />
        {showPageLink && (
          <Button asChild variant="outline" size="sm" className="h-10">
            <Link to="/teams/$slug" params={{ slug: team.slug }}>
              {t("detail.open")}
            </Link>
          </Button>
        )}
      </motion.div>

      <motion.section {...section(2)}>
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("detail.competitions")}
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {team.competitions.map((c) => (
            <li key={c.key} className="border border-border px-2 py-1">
              <CompetitionBadge name={c.name} />
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section {...section(3)} className="card-surface p-4">
        <h3 className="flex items-center gap-2 text-sm">
          <Table2 className="size-4 text-primary" aria-hidden="true" />
          {t("detail.table")}
          {s && <span className="font-normal text-muted-foreground">· {s.competition}</span>}
        </h3>
        {s ? (
          <dl className="mt-3 grid grid-cols-7 gap-1 text-center">
            {(
              [
                ["pos", String(s.position)],
                ["p", String(s.played)],
                ["w", String(s.won)],
                ["d", String(s.drawn)],
                ["l", String(s.lost)],
                [
                  "gd",
                  `${s.goalsFor - s.goalsAgainst > 0 ? "+" : ""}${s.goalsFor - s.goalsAgainst}`,
                ],
                ["pts", String(s.points)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className={cn("py-1", k === "pts" && "bg-primary-soft")}>
                <dt className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t(`detail.${k}`)}
                </dt>
                <dd className="font-display text-lg font-extrabold tnum">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("detail.noTable")}</p>
        )}
        {s && s.teams > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full bg-muted" aria-hidden="true">
              <motion.div
                className="h-full bg-primary"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.max(4, ((s.teams - s.position + 1) / s.teams) * 100)}%` }}
                transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {ordinal(s.position)} {t("detail.ofTeams", { count: s.teams })}
            </p>
          </div>
        )}
      </motion.section>

      <motion.section {...section(4)} className="card-surface p-4">
        <h3 className="flex items-center gap-2 text-sm">
          <TrendingUp className="size-4 text-primary" aria-hidden="true" />
          {t("detail.form")}
        </h3>
        {form === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("detail.formLoading")}</p>
        ) : form.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("detail.noForm")}</p>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {form.map((e, i) => (
              <motion.li
                key={`${e.kickoff_at}-${e.opponent}`}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center text-[11px] font-bold",
                    e.result === "W"
                      ? "bg-primary text-primary-foreground"
                      : e.result === "L"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted-foreground/25",
                  )}
                >
                  {e.result}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {e.venue === "H" ? t("card.vs") : t("card.at")} {e.opponent}
                </span>
                <span className="font-semibold tnum">
                  {e.scored}-{e.conceded}
                </span>
              </motion.li>
            ))}
          </ol>
        )}
      </motion.section>

      <motion.section {...section(5)} className="card-surface p-4">
        <h3 className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          {t("detail.next")}
        </h3>
        {team.nextFixture ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-semibold">
              {team.nextFixture.venue === "H" ? t("card.vs") : t("card.at")}{" "}
              {team.nextFixture.opponent}
            </p>
            <p className="text-xs text-muted-foreground">
              {team.nextFixture.competition} · {formatDateTime(team.nextFixture.kickoffAt)}
            </p>
            <Link
              to="/match/$fixtureId"
              params={{ fixtureId: team.nextFixture.id }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {t("detail.predict")}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
            {team.upcoming > 1 && (
              <p className="text-[11px] text-muted-foreground">
                {t("detail.upcoming", { count: team.upcoming })}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("detail.noNext")}</p>
        )}
      </motion.section>

      <motion.div {...section(6)} className="flex flex-wrap gap-4 text-xs font-semibold">
        <Link
          to="/fixtures"
          search={{ q: team.name }}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {t("detail.fixtures")}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
        {s && (
          <Link
            to="/tables"
            search={{ league: s.competitionKey }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {t("detail.fullTable")}
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </motion.div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3" aria-hidden="true" />
        {t("detail.source")}
      </p>
    </div>
  );
}
