import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, Lock, Share2, Swords, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CallsPicker, useCallLabel } from "@/components/duels/calls-picker";
import { DuelStatusPill, StakePill } from "@/components/duels/duel-card";
import { SplitBar } from "@/components/duels/split-bar";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { useSession } from "@/components/session";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import { duelErrorKey, validCalls, type DuelCall, type DuelMarket } from "@/lib/duels";
import {
  acceptDuel,
  fetchDuel,
  voteDuel,
  withdrawDuel,
  type DuelDetail,
  type DuelVotes,
} from "@/lib/duels-data";
import { headT } from "@/lib/i18n/head";
import { cn } from "@/lib/utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/duels/$duelId")({
  loader: async ({ params }) => {
    if (!UUID.test(params.duelId)) throw notFound();
    const duel = await fetchDuel(params.duelId).catch(() => null);
    if (!duel) throw notFound();
    return { duel };
  },
  head: ({ match, loaderData }) => {
    const t = headT(match.context.locale, "duels");
    const d = loaderData?.duel;
    const title = d
      ? t("meta.roomTitle", {
          a: d.challenger.username,
          b: d.opponent?.username ?? "?",
          home: d.fixture.home,
          away: d.fixture.away,
        })
      : t("meta.title");
    return {
      meta: [
        { title },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: title },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: DuelRoom,
});

function DuelRoom() {
  const { t } = useTranslation("duels");
  const { user } = useSession();
  const initial = Route.useLoaderData().duel;
  const [duel, setDuel] = useState<DuelDetail>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // The loader runs signed-out on the server: reload in the browser so a player sees their own hidden calls.
  const reload = useCallback(() => {
    fetchDuel(initial.id)
      .then((d) => d && setDuel(d))
      .catch((e: unknown) => console.error("duel reload failed", e));
  }, [initial.id]);
  useEffect(reload, [reload, user?.id]);

  const f = duel.fixture;
  const label = useCallLabel(f.home, f.away);
  const kicked = duel.revealed;
  // A named opponent appears as `me === "opponent"` before accepting; an open challenge is for anyone else.
  const canAccept =
    !!user &&
    duel.status === "pending" &&
    !kicked &&
    (duel.opponent ? duel.me === "opponent" : duel.me !== "challenger");
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(t(duelErrorKey(e instanceof Error ? e.message : undefined)));
    } finally {
      setBusy(false);
    }
  };

  const callsFor = (side: "challenger" | "opponent") => duel.picks.filter((p) => p.side === side);
  const winnerSide =
    duel.winner === duel.challenger.username
      ? "challenger"
      : duel.opponent && duel.winner === duel.opponent.username
        ? "opponent"
        : null;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: document.title });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AppShell>
      <Link
        to="/duels"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("room.back")}
      </Link>

      <header className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <CompetitionBadge name={f.competition} />
          <KickoffPill kickoff={f.kickoff_at} status={f.status} />
        </div>
        <Link
          to="/match/$fixtureId"
          params={{ fixtureId: f.id }}
          className="mx-5 mt-4 flex items-center justify-center gap-3 rounded-lg py-2 text-sm font-semibold hover:bg-muted/50"
        >
          <TeamLogo team={f.home} sport={f.sport} size="sm" />
          <span className="min-w-0 truncate">{f.home}</span>
          <span className="font-display text-lg font-extrabold tnum">
            {f.status === "finished" ? `${f.home_score}–${f.away_score}` : t("vs")}
          </span>
          <span className="min-w-0 truncate">{f.away}</span>
          <TeamLogo team={f.away} sport={f.sport} size="sm" />
        </Link>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 border-t border-border bg-muted/30 p-5">
          <PlayerColumn
            name={`@${duel.challenger.username}`}
            you={duel.me === "challenger"}
            won={winnerSide === "challenger"}
            correct={duel.challenger_correct}
            calls={callsFor("challenger")}
            markets={duel.markets}
            label={label}
            hidden={!kicked && duel.me !== "challenger"}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-ink-foreground">
              <Swords className="size-5" aria-hidden="true" />
            </span>
            <StakePill stake={duel.stake * (duel.opponent ? 2 : 1)} />
          </div>
          {duel.opponent ? (
            <PlayerColumn
              name={`@${duel.opponent.username}`}
              you={duel.me === "opponent"}
              won={winnerSide === "opponent"}
              correct={duel.opponent_correct}
              calls={callsFor("opponent")}
              markets={duel.markets}
              label={label}
              hidden={!kicked && duel.me !== "opponent"}
              align="right"
            />
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
              {t("room.waiting")}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className="flex flex-wrap items-center gap-2">
            <DuelStatusPill status={duel.status} open={!duel.opponent} />
            {duel.status === "settled" && (
              <span className="text-sm font-semibold">
                {winnerSide ? t("room.winner", { name: duel.winner }) : t("room.draw")}
              </span>
            )}
            {duel.status === "void" && <span className="text-sm">{t("room.void")}</span>}
          </span>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Share2 className="size-4" aria-hidden="true" />
            {copied ? t("room.copied") : t("room.share")}
          </button>
        </div>
        {duel.message && (
          <p className="border-t border-border px-5 py-3 text-sm italic text-muted-foreground">
            “{duel.message}” — @{duel.challenger.username}
          </p>
        )}
      </header>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {duel.status === "pending" && duel.me === "challenger" && (
        <Button
          variant="outline"
          className="mt-4"
          disabled={busy}
          onClick={() => void run(() => withdrawDuel(duel.id))}
        >
          {t("room.withdraw")}
        </Button>
      )}

      {canAccept && (
        <AcceptPanel
          duel={duel}
          busy={busy}
          onAccept={(c) => void run(() => acceptDuel(duel.id, c))}
          onDecline={duel.opponent ? () => void run(() => withdrawDuel(duel.id)) : undefined}
        />
      )}

      {duel.opponent && duel.status !== "pending" && (
        <Poll
          duel={duel}
          signedIn={!!user}
          onVoted={(v) => setDuel((d) => ({ ...d, votes: v }))}
          onError={setError}
        />
      )}
    </AppShell>
  );
}

function PlayerColumn({
  name,
  you,
  won,
  correct,
  calls,
  markets,
  label,
  hidden,
  align = "left",
}: {
  name: string;
  you: boolean;
  won: boolean;
  correct: number | null;
  calls: DuelDetail["picks"];
  markets: DuelMarket[];
  label: (m: DuelMarket, s: string) => string;
  hidden: boolean;
  align?: "left" | "right";
}) {
  const { t } = useTranslation("duels");
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className={cn("truncate font-display text-base font-extrabold", won && "text-primary")}>
        {name}
        {you && (
          <span className="ml-1.5 text-[10px] font-bold uppercase text-muted-foreground">
            {t("you")}
          </span>
        )}
      </p>
      {correct !== null && (
        <p className="text-xs text-muted-foreground tnum">
          {t("room.correct", { count: correct })}
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {markets.map((m) => {
          const c = calls.find((p) => p.market === m);
          return (
            <li
              key={m}
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs",
                align === "right" && "flex-row-reverse",
              )}
            >
              {hidden || !c ? (
                <>
                  <Lock className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate text-muted-foreground">{t("room.hiddenUntil")}</span>
                </>
              ) : (
                <>
                  {c.correct === true && (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  {c.correct === false && (
                    <X className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{t(`markets.${m}`)}: </span>
                    <b>{label(m, c.selection)}</b>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AcceptPanel({
  duel,
  busy,
  onAccept,
  onDecline,
}: {
  duel: DuelDetail;
  busy: boolean;
  onAccept: (calls: DuelCall[]) => void;
  onDecline: (() => void) | undefined;
}) {
  const { t } = useTranslation("duels");
  const [calls, setCalls] = useState<DuelCall[]>([]);
  const ready = validCalls(calls) && calls.length === duel.markets.length;
  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="accept-title">
      <h2 id="accept-title" className="text-lg">
        {t("accept.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("accept.body")}</p>
      <div className="mt-4">
        <CallsPicker
          home={duel.fixture.home}
          away={duel.fixture.away}
          value={calls}
          onChange={setCalls}
          fixed={duel.markets}
        />
      </div>
      {duel.stake > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("accept.stake", { points: duel.stake })}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!ready || busy} onClick={() => onAccept(calls)}>
          {t("accept.submit")}
        </Button>
        {onDecline && (
          <Button variant="outline" disabled={busy} onClick={onDecline}>
            {t("room.decline")}
          </Button>
        )}
      </div>
    </section>
  );
}

function Poll({
  duel,
  signedIn,
  onVoted,
  onError,
}: {
  duel: DuelDetail;
  signedIn: boolean;
  onVoted: (v: DuelVotes) => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation("duels");
  const [busy, setBusy] = useState(false);
  const a = duel.challenger.username;
  const b = duel.opponent?.username ?? "";
  const total = duel.votes.challenger + duel.votes.opponent;
  const canVote = signedIn && duel.revealed && duel.status === "active" && !duel.me;
  const vote = async (side: "challenger" | "opponent") => {
    setBusy(true);
    try {
      onVoted(await voteDuel(duel.id, side));
    } catch (e) {
      onError(t(duelErrorKey(e instanceof Error ? e.message : undefined)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="poll-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="poll-title" className="text-lg">
          {t("poll.title")}
        </h2>
        <span className="text-xs text-muted-foreground tnum">
          {t("poll.votes", { count: total })}
        </span>
      </div>
      <div className="mt-4">
        <SplitBar
          left={duel.votes.challenger}
          right={duel.votes.opponent}
          leftLabel={`@${a}`}
          rightLabel={`@${b}`}
        />
      </div>
      {canVote ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["challenger", "opponent"] as const).map((side) => (
            <Button
              key={side}
              variant={duel.votes.mine === side ? "default" : "outline"}
              disabled={busy}
              aria-pressed={duel.votes.mine === side}
              onClick={() => void vote(side)}
            >
              {t("poll.vote", { name: side === "challenger" ? a : b })}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {duel.status !== "active"
            ? t("poll.closed")
            : !duel.revealed
              ? t("poll.opens")
              : !signedIn
                ? t("poll.signin")
                : duel.votes.mine
                  ? t("poll.yourVote")
                  : ""}
        </p>
      )}
    </section>
  );
}
