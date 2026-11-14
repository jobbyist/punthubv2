import { PageArt } from "@/components/motion/page-art";
import { ClubBadge } from "@/components/practice-badge";
import { DemoWalletCard, MatchInsight } from "@/components/practice-wallet";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RgNotice } from "@/components/rg-notice";
import { RequireMember } from "@/components/account-gate";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime, formatTime, odds, points } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import {
  PRACTICE_MARKETS,
  fetchCrowd,
  fetchFixtures,
  fetchLeaderboard,
  fetchMyPicks,
  fetchPracticeBalance,
  fetchPracticeRewards,
  fetchPracticeStatus,
  fetchSeason,
  postPracticePick,
  redeemDemoReward,
  type PracticeFixture,
} from "@/lib/practice/data";
import { GRADUATE_SETTLED_PICKS, phaseAt, type PracticePhase } from "@/lib/practice/simulator";

export const Route = createFileRoute("/practice")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "practice");
    return {
      // Practice Mode is for signed-in Founding Members only: keep it out of search results.
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: PracticePage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <PageArt
        kind="pitch"
        className="absolute right-4 top-6 hidden h-24 w-40 opacity-80 sm:right-6 md:block"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function PracticeBadge() {
  const { t } = useTranslation("practice");
  return (
    <span className="inline-block border border-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
      {t("badge")}
    </span>
  );
}

function PracticePage() {
  const { t } = useTranslation("practice");
  const status = useAsync(fetchPracticeStatus, []);

  return (
    <RequireMember>
      {() => {
        if (status.loading) return <Shell>{null}</Shell>;
        if (!status.data?.founding)
          return (
            <Shell>
              <h1 className="text-2xl">{t("foundingOnly.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("foundingOnly.body")}</p>
              <Button asChild className="mt-4">
                <Link to="/founding">{t("foundingOnly.cta")}</Link>
              </Button>
              <RgNotice variant="compact" className="mt-8" />
            </Shell>
          );
        if (!status.data.enabled)
          return (
            <Shell>
              <PracticeBadge />
              <h1 className="mt-3 text-2xl">{t("closed.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("closed.body")}</p>
              <RgNotice variant="compact" className="mt-8" />
            </Shell>
          );
        return <Arena />;
      }}
    </RequireMember>
  );
}

function Arena() {
  const { t } = useTranslation("practice");
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  const refresh = () => setTick((n) => n + 1);

  const season = useAsync(fetchSeason, [tick]);
  const seasonId = season.data?.id;
  const fixtures = useAsync(
    () => (seasonId ? fetchFixtures(seasonId) : Promise.resolve([])),
    [seasonId, tick],
  );
  const crowd = useAsync(
    () => (seasonId ? fetchCrowd(seasonId) : Promise.resolve([])),
    [seasonId, tick],
  );
  const picks = useAsync(fetchMyPicks, [tick]);
  const balance = useAsync(fetchPracticeBalance, [tick]);
  const board = useAsync(fetchLeaderboard, [tick]);

  const settled = (picks.data ?? []).filter((p) => p.result !== null).length;
  const graduate = settled >= GRADUATE_SETTLED_PICKS;

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-2">
        <PracticeBadge />
        <span className="border border-border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("simulated")}
        </span>
      </div>
      <h1 className="mt-3 text-3xl">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("lead")}</p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={t("eyebrow")}>
        <Kpi label={t("kpi.points")} value={points(balance.data ?? 0)} />
        <Kpi label={t("kpi.picks")} value={String((picks.data ?? []).length)} />
        <Kpi label={t("kpi.settled")} value={String(settled)} />
        <Kpi
          label={t("kpi.graduate")}
          value={graduate ? t("graduate.earned") : `${settled}/${GRADUATE_SETTLED_PICKS}`}
        />
      </section>
      {!graduate && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("graduate.progress", { count: settled, total: GRADUATE_SETTLED_PICKS })}
        </p>
      )}

      <DemoWalletCard nonce={tick} />

      <section className="card-surface mt-6 p-5">
        <h2 className="text-lg">{t("draw.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("draw.body")}</p>
        <Button asChild className="mt-3">
          <Link to="/feedback">{t("draw.cta")}</Link>
        </Button>
      </section>

      <Fixtures
        season={season.data}
        fixtures={fixtures.data ?? []}
        crowd={crowd.data ?? []}
        myPicks={picks.data ?? []}
        now={now}
        onPosted={refresh}
      />

      <section className="card-surface mt-6 p-5" aria-labelledby="mine-title">
        <h2 id="mine-title" className="text-lg">
          {t("mine.title")}
        </h2>
        {(picks.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("mine.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {(picks.data ?? []).slice(0, 12).map((p) => {
              const fx = (fixtures.data ?? []).find((f) => f.id === p.fixture_id);
              return (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span>
                    {fx ? `${fx.home} v ${fx.away}` : ""}{" "}
                    <span className="text-muted-foreground">
                      {t(`market.${p.market}`)}: {t(`selection.${p.selection}`)} @ {odds(p.odds)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold">
                    {t(`mine.result.${p.result ?? "pending"}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card-surface mt-6 p-5" aria-labelledby="board-title">
        <h2 id="board-title" className="text-lg">
          {t("board.title")}
        </h2>
        {(board.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("board.empty")}</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">{t("board.rank")}</th>
                <th>{t("board.member")}</th>
                <th className="text-right">{t("board.points")}</th>
                <th className="text-right">{t("board.settled")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(board.data ?? []).map((r) => (
                <tr key={String(r.rank)} className={r.is_me ? "font-semibold" : undefined}>
                  <td className="py-2 tnum">{String(r.rank)}</td>
                  <td>
                    @{r.username}
                    {r.is_me && <span className="ml-2 text-xs text-primary">{t("board.you")}</span>}
                    {r.graduate && (
                      <span className="ml-2 border border-primary px-1 text-[10px] uppercase text-primary">
                        {t("graduate.earned")}
                      </span>
                    )}
                  </td>
                  <td className="text-right tnum">{points(Number(r.points))}</td>
                  <td className="text-right tnum">{String(r.settled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <DemoRewards balance={balance.data ?? 0} onChange={refresh} />

      <section className="mt-6 text-xs text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">{t("rules.title")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {(t("rules.items", { returnObjects: true }) as unknown as string[]).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <RgNotice variant="compact" className="mt-8" />
    </Shell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tnum">{value}</p>
    </div>
  );
}

type Season = NonNullable<Awaited<ReturnType<typeof fetchSeason>>>;

function Fixtures({
  season,
  fixtures,
  crowd,
  myPicks,
  now,
  onPosted,
}: {
  season: Season | null | undefined;
  fixtures: PracticeFixture[];
  crowd: { fixture_id: string; home: number; draw: number; away: number }[];
  myPicks: { fixture_id: string; market: string }[];
  now: number;
  onPosted: () => void;
}) {
  const { t } = useTranslation("practice");
  if (!season) return null;
  const timing = {
    roundSeconds: season.round_seconds,
    lockSeconds: season.lock_seconds,
    fullTimeSeconds: season.full_time_seconds,
  };
  const withPhase = fixtures.map((f) => ({
    f,
    phase: phaseAt(new Date(f.kickoff_at).getTime(), now, timing),
  }));
  const visible = withPhase.filter((x) => x.phase !== "upcoming").slice(-12);
  const current = visible.length ? Math.max(...visible.map((x) => x.f.round)) : 0;

  return (
    <section className="mt-6" aria-labelledby="fixtures-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="fixtures-title" className="text-lg">
          {t("fixtures.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("season", { number: season.number, round: current })}
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="card-surface mt-3 p-5 text-sm text-muted-foreground">{t("fixtures.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map(({ f, phase }) => (
            <FixtureCard
              key={f.id}
              fixture={f}
              phase={phase}
              lockMs={new Date(f.kickoff_at).getTime() - season.lock_seconds * 1000}
              crowd={crowd.find((c) => c.fixture_id === f.id)}
              taken={myPicks.filter((p) => p.fixture_id === f.id).map((p) => p.market)}
              onPosted={onPosted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FixtureCard({
  fixture,
  phase,
  lockMs,
  crowd,
  taken,
  onPosted,
}: {
  fixture: PracticeFixture;
  phase: PracticePhase;
  lockMs: number;
  crowd: { home: number; draw: number; away: number } | undefined;
  taken: string[];
  onPosted: () => void;
}) {
  const { t } = useTranslation("practice");
  const [market, setMarket] = useState<(typeof PRACTICE_MARKETS)[number]["market"]>("1X2");
  const [selection, setSelection] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [busy, setBusy] = useState(false);
  const def = PRACTICE_MARKETS.find((m) => m.market === market)!;
  const marketOdds = fixture.odds[market] as Record<string, number>;
  const already = taken.includes(market);
  const total = crowd ? Number(crowd.home) + Number(crowd.draw) + Number(crowd.away) : 0;

  async function submit() {
    if (!selection) return;
    setBusy(true);
    try {
      await postPracticePick({ fixture: fixture.id, market, selection, confidence });
      toast.success(t("pick.done"));
      setSelection(null);
      onPosted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "");
      const key = [
        "kickoff_passed",
        "fixture_not_open",
        "practice_closed",
        "age_not_attested",
        "invalid_selection",
      ].find((k) => msg.includes(k));
      toast.error(t(`pick.error.${key ?? "generic"}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <ClubBadge team={fixture.home} />
          <span>{fixture.home}</span>
          <span className="text-muted-foreground">v</span>
          <span>{fixture.away}</span>
          <ClubBadge team={fixture.away} />
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {t(`fixtures.phase.${phase}`)}
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {phase === "finished" && fixture.home_score !== null
          ? `${fixture.home_score} - ${fixture.away_score}`
          : phase === "open"
            ? t("fixtures.lockAt", { time: formatTime(lockMs) })
            : t("fixtures.kickoff", { time: formatDateTime(fixture.kickoff_at) })}
      </p>

      {total > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("crowd.title")}: {Math.round((Number(crowd!.home) / total) * 100)}% /{" "}
          {Math.round((Number(crowd!.draw) / total) * 100)}% /{" "}
          {Math.round((Number(crowd!.away) / total) * 100)}% ({t("crowd.count", { count: total })})
        </p>
      )}

      {(phase === "open" || phase === "upcoming") && (
        <div className="mt-3">
          <MatchInsight
            fixtureId={fixture.id}
            lambdaHome={Number(fixture.lambda_home)}
            lambdaAway={Number(fixture.lambda_away)}
            onSpent={onPosted}
          />
        </div>
      )}

      {phase === "open" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("market.1X2")}>
            {PRACTICE_MARKETS.map((m) => (
              <button
                key={m.market}
                type="button"
                onClick={() => {
                  setMarket(m.market);
                  setSelection(null);
                }}
                className={`border px-3 py-1.5 text-xs font-semibold ${
                  market === m.market
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {t(`market.${m.market}`)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {def.selections.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={already}
                onClick={() => setSelection(s.value)}
                className={`border px-2 py-2 text-sm ${
                  selection === s.value ? "border-primary bg-primary/10" : "border-border"
                } disabled:opacity-50`}
              >
                <span className="block font-medium">{t(`selection.${s.value}`)}</span>
                <span className="block text-xs text-muted-foreground tnum">
                  {odds(marketOdds[s.priceKey] ?? 0)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              {t("pick.confidence")}
              <select
                className="border border-border bg-background px-2 py-1"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" disabled={busy || already || !selection} onClick={submit}>
              {already ? t("pick.locked") : t("pick.submit")}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function DemoRewards({ balance, onChange }: { balance: number; onChange: () => void }) {
  const { t } = useTranslation("practice");
  const { data } = useAsync(fetchPracticeRewards, []);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data || data.length === 0) return null;

  async function redeem(id: string) {
    setBusy(id);
    try {
      const row = await redeemDemoReward(id);
      toast.success(t("rewards.done", { code: row?.demo_code ?? "DEMO-XXXX-XXXX" }));
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "");
      toast.error(
        t(
          msg.includes("not_enough_points")
            ? "rewards.error.not_enough_points"
            : "rewards.error.generic",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6" aria-labelledby="demo-rewards-title">
      <h2 id="demo-rewards-title" className="text-lg">
        {t("rewards.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.body")}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {data.map((r) => (
          <li key={r.id} className="card-surface flex flex-col p-4">
            <p className="font-semibold">{r.title}</p>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{r.description}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-primary tnum">
                {t("rewards.cost", { points: points(r.points_cost) })}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || balance < r.points_cost}
                onClick={() => redeem(r.id)}
              >
                {t("rewards.redeem")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
