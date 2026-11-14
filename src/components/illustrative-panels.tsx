import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FixtureCard, KickoffMeta } from "@/components/fixture-card";
import { Podium, RankRow } from "@/components/leader-board";

const SAMPLE_FIXTURES = [
  {
    home: "Orlando Pirates",
    away: "Kaizer Chiefs",
    sport: "soccer",
    competition: "Betway Premiership",
    time: "19:30",
  },
  {
    home: "Arsenal",
    away: "Liverpool",
    sport: "soccer",
    competition: "Premier League",
    time: "18:30",
  },
  {
    home: "Real Madrid",
    away: "Bayern Munich",
    sport: "soccer",
    competition: "UEFA Champions League",
    time: "03:00",
  },
  {
    home: "South Africa",
    away: "New Zealand",
    sport: "rugby",
    competition: "International Rugby",
    time: "17:00",
  },
  {
    home: "Golden State Warriors",
    away: "Boston Celtics",
    sport: "basketball",
    competition: "NBA",
    time: "02:30",
  },
  {
    home: "South Africa",
    away: "India",
    sport: "cricket",
    competition: "International Cricket",
    time: "10:00",
  },
] as const;

const SAMPLE_LEADERS = [
  { name: "CapeTownCall", units: "34.2", roi: "+22.4%", picks: "18" },
  { name: "SowetoScout", units: "29.8", roi: "+18.7%", picks: "16" },
  { name: "DurbanData", units: "26.4", roi: "+16.1%", picks: "15" },
  { name: "MzansiMind", units: "23.1", roi: "+13.8%", picks: "14" },
  { name: "JoziTactician", units: "20.6", roi: "+11.2%", picks: "12" },
];

const SAMPLE_RESULTS = [
  {
    home: "Orlando Pirates",
    away: "Kaizer Chiefs",
    sport: "soccer",
    competition: "Betway Premiership",
    score: { home: 2, away: 1 },
  },
  {
    home: "Arsenal",
    away: "Liverpool",
    sport: "soccer",
    competition: "Premier League",
    score: { home: 1, away: 1 },
  },
  {
    home: "South Africa",
    away: "New Zealand",
    sport: "rugby",
    competition: "International Rugby",
    score: { home: 24, away: 18 },
  },
] as const;

const TOP_UNITS = Number(SAMPLE_LEADERS[0]!.units);

function IllustrativeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
      <span className="puntr-blink size-1.5 rounded-full bg-primary" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Sample board body: podium for the top three, ranked rows for everyone. Sample data only. */
function SampleBoard({
  unitsLabel,
  roiLabel,
  picksLabel,
}: {
  unitsLabel: string;
  roiLabel: string;
  picksLabel: string;
}) {
  return (
    <>
      <Podium
        unit={unitsLabel}
        entries={SAMPLE_LEADERS.slice(0, 3).map((m) => ({
          name: m.name,
          value: m.units,
          sub: m.roi,
        }))}
      />
      <ol className="divide-y divide-border border-t border-border">
        {SAMPLE_LEADERS.map((m, i) => (
          <RankRow
            key={m.name}
            rank={i + 1}
            index={i}
            name={m.name}
            primary={m.units}
            share={Number(m.units) / TOP_UNITS}
            stats={[
              { label: roiLabel, value: m.roi },
              { label: picksLabel, value: m.picks },
            ]}
          />
        ))}
      </ol>
    </>
  );
}

/** Static design-preview content only. These samples are illustrative, not live fixture or member data. */
export function IllustrativeFixtures() {
  const { t } = useTranslation("common");
  const [view, setView] = useState<"fixtures" | "results" | "leaderboard">("fixtures");
  const views = ["fixtures", "results", "leaderboard"] as const;

  return (
    <section aria-labelledby="fixture-experience-title">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <IllustrativeBadge label={t("illustrative.badge")} />
          <h2 id="fixture-experience-title" className="mt-3 text-xl sm:text-2xl">
            {t("illustrative.experience.title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("illustrative.experience.body")}
          </p>
        </div>
        <div
          className="inline-flex w-full rounded-xl border border-border bg-muted/50 p-1 sm:w-auto"
          role="group"
          aria-label={t("illustrative.experience.tabsLabel")}
        >
          {views.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`min-h-10 flex-1 rounded-lg px-4 text-xs font-semibold transition-all sm:flex-none ${view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t(`illustrative.experience.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[250px]" aria-live="polite" aria-atomic="true">
        {view === "fixtures" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SAMPLE_FIXTURES.map((f, i) => (
              <div
                key={f.competition + f.home}
                className="puntr-rise"
                style={{ ["--i" as string]: i }}
              >
                <FixtureCard
                  className="h-full"
                  home={f.home}
                  away={f.away}
                  sport={f.sport}
                  sportLabel={t("sport." + f.sport)}
                  competition={f.competition}
                  time={f.time}
                  dayLabel="SAST"
                  vsLabel={t("vs")}
                  footer={<KickoffMeta label={t("illustrative.fixtures.kickoff")} />}
                />
              </div>
            ))}
          </div>
        )}
        {view === "results" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SAMPLE_RESULTS.map((r, i) => (
              <div key={r.competition} className="puntr-rise" style={{ ["--i" as string]: i }}>
                <FixtureCard
                  className="h-full"
                  home={r.home}
                  away={r.away}
                  sport={r.sport}
                  sportLabel={t("sport." + r.sport)}
                  competition={r.competition}
                  status="final"
                  statusLabel={t("illustrative.experience.fullTime")}
                  score={r.score}
                  footer={<span>{t("illustrative.experience.sampleResult")}</span>}
                />
              </div>
            ))}
          </div>
        )}
        {view === "leaderboard" && (
          <div className="card-surface overflow-hidden">
            <div className="border-b border-border p-4 sm:p-5">
              <p className="text-sm font-semibold">{t("illustrative.experience.boardTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("illustrative.experience.boardBody")}
              </p>
            </div>
            <SampleBoard
              unitsLabel={t("illustrative.experience.unitsShort")}
              roiLabel={t("illustrative.leaderboard.roi")}
              picksLabel={t("illustrative.leaderboard.picks")}
            />
          </div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">{t("illustrative.experience.note")}</p>
    </section>
  );
}

/** A separate sample board; the live weekly leaderboard continues to use Supabase data. */
export function IllustrativeLeaderboard() {
  const { t } = useTranslation("common");

  return (
    <section className="card-surface overflow-hidden" aria-labelledby="illustrative-board-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <h2 id="illustrative-board-title" className="text-lg">
            {t("illustrative.leaderboard.title")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("illustrative.leaderboard.body")}
          </p>
        </div>
        <IllustrativeBadge label={t("illustrative.badge")} />
      </div>
      <SampleBoard
        unitsLabel={t("illustrative.experience.unitsShort")}
        roiLabel={t("illustrative.leaderboard.roi")}
        picksLabel={t("illustrative.leaderboard.picks")}
      />
    </section>
  );
}
