import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { TeamLogo } from "@/components/team-logo";
import type { DuelSummary } from "@/lib/duels-data";
import { cn } from "@/lib/utils";

import { SplitBar } from "./split-bar";

export function DuelStatusPill({ status, open }: { status: string; open?: boolean }) {
  const { t } = useTranslation("duels");
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        status === "active" && "bg-primary text-primary-foreground",
        status === "pending" && "bg-primary-soft text-primary",
        status === "settled" && "bg-ink text-ink-foreground",
        !["active", "pending", "settled"].includes(status) &&
          "border border-border text-muted-foreground",
      )}
    >
      {status === "pending" && open ? t("status.open") : t(`status.${status}`)}
    </span>
  );
}

export function StakePill({ stake }: { stake: number }) {
  const { t } = useTranslation("duels");
  return (
    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide tnum">
      {stake > 0 ? t("stake.points", { points: stake }) : t("stake.friendly")}
    </span>
  );
}

/** A duel in a list: match, the two members, stake, status and (once live) the community split. */
export function DuelCard({ duel }: { duel: DuelSummary }) {
  const { t } = useTranslation("duels");
  const f = duel.fixture;
  const settled = duel.status === "settled";
  const side = (name: string | null, correct: number | null, won: boolean) => (
    <span className={cn("min-w-0 truncate text-sm font-bold", won && "text-primary")}>
      {name ? `@${name}` : t("open")}
      {settled && correct !== null && (
        <span className="ml-1.5 text-xs font-semibold text-muted-foreground tnum">{correct}</span>
      )}
    </span>
  );
  return (
    <Link
      to="/duels/$duelId"
      params={{ duelId: duel.id }}
      className="card-surface card-interactive block p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <CompetitionBadge name={f.competition} />
        <KickoffPill kickoff={f.kickoff_at} status={f.status} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <TeamLogo team={f.home} sport={f.sport} size="sm" className="size-5" />
        <span className="min-w-0 truncate font-semibold text-foreground">
          {f.home} {t("vs")} {f.away}
        </span>
        <TeamLogo team={f.away} sport={f.sport} size="sm" className="size-5" />
        {f.status === "finished" && (
          <span className="ml-auto font-display font-extrabold text-foreground tnum">
            {f.home_score}–{f.away_score}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
        {side(duel.challenger, duel.challenger_correct, duel.winner === duel.challenger)}
        <Swords className="size-4 text-primary" aria-hidden="true" />
        <span className="text-right">
          {side(
            duel.opponent,
            duel.opponent_correct,
            !!duel.opponent && duel.winner === duel.opponent,
          )}
        </span>
      </div>
      {duel.status === "active" &&
        duel.votes.challenger + duel.votes.opponent > 0 &&
        duel.opponent && (
          <div className="mt-3">
            <SplitBar
              left={duel.votes.challenger}
              right={duel.votes.opponent}
              leftLabel={`@${duel.challenger}`}
              rightLabel={`@${duel.opponent}`}
            />
          </div>
        )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DuelStatusPill status={duel.status} open={!duel.opponent} />
        <StakePill stake={duel.stake} />
        <span className="text-[11px] text-muted-foreground">
          {duel.markets.map((m) => t(`markets.${m}`)).join(" · ")}
        </span>
      </div>
    </Link>
  );
}
