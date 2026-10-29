import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { formatTime, odds as formatOdds } from "@/lib/format";
import { selectionLabel } from "@/lib/pick-labels";
import { shareText } from "@/lib/referral";
import { whatsappUrl } from "@/lib/referral";
import type { FixtureRow } from "@/lib/pick-data";
import {
  MARKETS_BY_SPORT,
  REASONING_MAX,
  SELECTIONS,
  countdownTo,
  lockedBefore,
  formatSpan,
  parseLine,
  parseOdds,
  pickErrorKey,
  validatePick,
  type Market,
} from "@/lib/picks";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

/** The pick form for one fixture. There is no edit or delete control anywhere: a pick is final once locked. */
export function PickForm({ fixture, onPosted }: { fixture: FixtureRow; onPosted: () => void }) {
  const { t } = useTranslation("match");
  const { loading, profile, user } = useSession();
  const now = useNow();

  const markets = MARKETS_BY_SPORT[fixture.sport];
  const [market, setMarket] = useState<Market>(markets[0]!);
  const [selection, setSelection] = useState<string | null>(null);
  const [line, setLine] = useState("");
  const [odds, setOdds] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const teams = { home: fixture.home, away: fixture.away };
  const countdown = now ? countdownTo(fixture.kickoff_at, now) : null;
  const closed = fixture.status !== "scheduled" || countdown?.state === "locked";

  if (closed) {
    const key =
      fixture.status === "scheduled" || fixture.status === "live"
        ? "countdown.locked"
        : "countdown.closed";
    return (
      <section className="card-surface p-5" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden>🔒</span>
          {t(key, { time: formatTime(fixture.kickoff_at) })}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t("form.permanent")}</p>
      </section>
    );
  }

  if (!loading && !user) {
    return (
      <section className="card-surface p-5">
        <p className="text-sm">{t("form.signIn")}</p>
        <Button asChild className="mt-3">
          <Link to="/join">{t("form.signInCta")}</Link>
        </Button>
      </section>
    );
  }
  if (!loading && user && !profile) {
    return (
      <section className="card-surface p-5">
        <p className="text-sm">{t("form.needProfile")}</p>
        <Button asChild className="mt-3">
          <Link to="/join">{t("form.finishCta")}</Link>
        </Button>
      </section>
    );
  }

  const changeMarket = (next: string) => {
    setMarket(next as Market);
    setSelection(null);
    setLine("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const problem = validatePick({ market, selection, line, odds, confidence, reasoning });
    if (problem) return setError(t(`form.problem.${problem}`));
    if (!profile) return;

    setBusy(true);
    setShared(null);
    const { data: row, error: err } = await supabase.rpc("create_prediction", {
      p_fixture_id: fixture.id,
      p_market: market,
      p_selection: selection!,
      // The generated types do not mark nullable arguments; the function accepts null for both.
      p_line: (market === "HCP" ? parseLine(line) : null) as number,
      p_odds: parseOdds(odds)!,
      p_confidence: confidence!,
      p_reasoning: (reasoning.trim() || null) as string,
    });
    if (err) {
      setBusy(false);
      const key = pickErrorKey(err);
      setError(t(`error.${key}`, { market: t(`market.${market}`) }));
      if (key === "kickoff_passed") onPosted();
      return;
    }

    analytics.pickPosted(market, fixture.sport);
    if (row) {
      const label = selectionLabel(
        t,
        { market, selection: selection!, line: market === "HCP" ? parseLine(line) : null },
        teams,
      );
      const wording =
        market === "1X2" && selection !== "draw" ? t("share.toWin", { team: label }) : label;
      setShared(
        shareText({
          label: wording,
          odds: formatOdds(parseOdds(odds)!),
          lockedBefore: lockedBefore(row.created_at, fixture.kickoff_at),
          fixtureId: fixture.id,
          code: profile.referral_code,
        }),
      );
    }
    const { count } = await supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
    if (count === 1) analytics.userActivated();

    setBusy(false);
    toast.success(t("form.success"));
    setSelection(null);
    setLine("");
    setOdds("");
    setConfidence(null);
    setReasoning("");
    onPosted();
  };

  return (
    <>
      {shared && (
        <section className="card-surface mb-6 border-primary p-5" aria-live="polite">
          <h2 className="text-lg">{t("share.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("share.body")}</p>
          <p className="mt-3 border border-border bg-muted/40 p-3 text-sm">{shared}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a
                href={whatsappUrl(shared)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.shareClicked("pick")}
              >
                {t("share.whatsapp")}
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shared);
                  analytics.shareClicked("pick");
                  toast.success(t("share.copied"));
                } catch {
                  /* nothing to do: the text is selectable above */
                }
              }}
            >
              {t("share.copy")}
            </Button>
          </div>
        </section>
      )}
      <form onSubmit={submit} className="card-surface space-y-5 p-5" noValidate>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">{t("form.title")}</h2>
          {countdown && (
            <p className="text-sm font-semibold text-primary tnum" aria-live="polite">
              {t("countdown.locksIn", { span: formatSpan(countdown) })}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("form.market")}</Label>
          <Tabs value={market} onValueChange={changeMarket}>
            <TabsList className="h-auto w-full flex-wrap justify-start">
              {markets.map((m) => (
                <TabsTrigger key={m} value={m}>
                  {t(`market.${m}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-1.5">
          <Label>{t("form.selection")}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {SELECTIONS[market].map((s) => {
              const active = selection === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelection(s)}
                  className={cn(
                    "border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {selectionLabel(
                    t,
                    {
                      market,
                      selection: s,
                      line: market === "HCP" ? (parseLine(line) ?? 0) : null,
                    },
                    teams,
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {market === "HCP" && (
          <div className="space-y-1.5">
            <Label htmlFor="p-line">{t("form.line")}</Label>
            <Input
              id="p-line"
              inputMode="decimal"
              placeholder="-6.5"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="max-w-[10rem] tnum"
            />
            <p className="text-xs text-muted-foreground">
              {t("form.lineHint", { home: fixture.home })}
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-odds">{t("form.odds")}</Label>
            <Input
              id="p-odds"
              inputMode="decimal"
              placeholder="2.10"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              className="tnum"
            />
            <p className="text-xs text-muted-foreground">{t("form.oddsHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label id="p-conf-label">{t("form.confidence")}</Label>
            <div role="radiogroup" aria-labelledby="p-conf-label" className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={confidence === n}
                  onClick={() => setConfidence(n)}
                  className={cn(
                    "size-10 border text-sm font-semibold tnum transition-colors",
                    confidence === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("form.confidenceHint")}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-reasoning">{t("form.reasoning")}</Label>
          <Textarea
            id="p-reasoning"
            rows={3}
            maxLength={REASONING_MAX}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
          />
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>{t("form.reasoningHint")}</span>
            <span className="tnum">
              {t("form.counter", { count: reasoning.length, max: REASONING_MAX })}
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("form.permanent")}</p>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? t("form.submitting") : t("form.submit")}
        </Button>
      </form>
    </>
  );
}
