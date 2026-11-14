import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Swords } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/format";
import { duelErrorKey, validCalls, type DuelCall } from "@/lib/duels";
import { createDuel, fetchDuelConfig, type DuelConfig } from "@/lib/duels-data";

import { CallsPicker } from "./calls-picker";

export interface ChallengeFixture {
  id: string;
  home: string;
  away: string;
  competition: string;
  kickoff_at: string;
}

/**
 * Start a duel: optional opponent (empty = open challenge), 2-3 calls, optional stake when staking is on, an
 * optional message. With several fixtures the member picks the match first. The database re-checks everything.
 */
export function ChallengeDialog({
  fixtures,
  opponent: presetOpponent,
  trigger,
}: {
  fixtures: ChallengeFixture[];
  opponent?: string;
  trigger?: ReactNode;
}) {
  const { t } = useTranslation("duels");
  const { user } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<DuelConfig | null>(null);
  const [fixtureId, setFixtureId] = useState(fixtures[0]?.id ?? "");
  const [opponent, setOpponent] = useState(presetOpponent ?? "");
  const [calls, setCalls] = useState<DuelCall[]>([]);
  const [stake, setStake] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchDuelConfig()
      .then(setConfig)
      .catch((e: unknown) => console.error("duel config failed", e));
  }, [open]);

  const fixture = fixtures.find((f) => f.id === fixtureId) ?? fixtures[0];
  const ready = !!fixture && validCalls(calls) && !busy;

  const button = trigger ?? (
    <Button variant="outline" className="gap-2">
      <Swords className="size-4 text-primary" aria-hidden="true" />
      {t("challenge.button")}
    </Button>
  );

  if (!user) {
    return (
      <Link to="/join" className="contents">
        {button}
      </Link>
    );
  }

  async function submit() {
    if (!fixture || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createDuel({
        fixtureId: fixture.id,
        opponent: opponent.trim() || null,
        stake,
        calls,
        message: message.trim() || null,
      });
      setOpen(false);
      void navigate({ to: "/duels/$duelId", params: { duelId: id } });
    } catch (e) {
      setError(t(duelErrorKey(e instanceof Error ? e.message : undefined)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("challenge.title")}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("challenge.hidden")}
          </DialogDescription>
        </DialogHeader>

        {config && !config.mvp_open && (
          <p className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
            {t("errors.not_launched")}
          </p>
        )}

        <div className="space-y-5">
          {fixtures.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="duel-fixture">{t("challenge.fixture")}</Label>
              <select
                id="duel-fixture"
                value={fixtureId}
                onChange={(e) => {
                  setFixtureId(e.target.value);
                  setCalls([]);
                }}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.home} {t("vs")} {f.away} · {formatDate(f.kickoff_at)}{" "}
                    {formatTime(f.kickoff_at)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            fixture && (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <b>
                  {fixture.home} {t("vs")} {fixture.away}
                </b>
                <span className="block text-xs text-muted-foreground tnum">
                  {fixture.competition} · {formatDate(fixture.kickoff_at)}{" "}
                  {formatTime(fixture.kickoff_at)}
                </span>
              </p>
            )
          )}

          <div className="space-y-1.5">
            <Label htmlFor="duel-opponent">{t("challenge.opponent")}</Label>
            <Input
              id="duel-opponent"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value.slice(0, 30))}
              placeholder={t("challenge.opponentPlaceholder")}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t("challenge.opponentHint")}</p>
          </div>

          {fixture && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("challenge.calls")}</p>
              <CallsPicker
                home={fixture.home}
                away={fixture.away}
                value={calls}
                onChange={setCalls}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="duel-stake">{t("challenge.stake")}</Label>
            {config?.stakes_enabled ? (
              <>
                <Input
                  id="duel-stake"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={config.stake_max}
                  step={5}
                  value={stake || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setStake(Math.max(0, Math.min(config.stake_max, Number(e.target.value) || 0)))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("challenge.stakeHint", {
                    min: config.stake_min,
                    max: config.stake_max,
                    available: config.transferable ?? 0,
                  })}
                </p>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                {t("challenge.stakeOff")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duel-message">{t("challenge.message")}</Label>
            <Textarea
              id="duel-message"
              rows={2}
              maxLength={140}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("challenge.messagePlaceholder")}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button className="w-full" disabled={!ready} onClick={() => void submit()}>
            {busy ? t("challenge.sending") : t("challenge.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
