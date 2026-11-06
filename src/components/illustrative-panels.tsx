import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "@/components/team-logo";

const SAMPLE_FIXTURES = [
  { home: "Orlando Pirates", away: "Kaizer Chiefs", sport: "soccer", competition: "Betway Premiership", time: "19:30 SAST" },
  { home: "Arsenal", away: "Liverpool", sport: "soccer", competition: "Premier League", time: "18:30 SAST" },
  { home: "Real Madrid", away: "Bayern Munich", sport: "soccer", competition: "UEFA Champions League", time: "03:00 SAST" },
  { home: "South Africa", away: "New Zealand", sport: "rugby", competition: "International Rugby", time: "17:00 SAST" },
  { home: "Golden State Warriors", away: "Boston Celtics", sport: "basketball", competition: "NBA", time: "02:30 SAST" },
  { home: "South Africa", away: "India", sport: "cricket", competition: "International Cricket", time: "10:00 SAST" },
] as const;

const SAMPLE_LEADERS = [
  { name: "CapeTownCall", units: "34.2", roi: "+22.4%", picks: "18" },
  { name: "SowetoScout", units: "29.8", roi: "+18.7%", picks: "16" },
  { name: "DurbanData", units: "26.4", roi: "+16.1%", picks: "15" },
  { name: "MzansiMind", units: "23.1", roi: "+13.8%", picks: "14" },
  { name: "JoziTactician", units: "20.6", roi: "+11.2%", picks: "12" },
];

/** Static design-preview content only. These samples are illustrative, not live fixture or member data. */
export function IllustrativeFixtures() {
  const { t } = useTranslation("common");
  const [view, setView] = useState<"fixtures" | "results" | "leaderboard">("fixtures");
  const views = [
    { id: "fixtures" as const, label: "Fixtures" },
    { id: "results" as const, label: "Results" },
    { id: "leaderboard" as const, label: "Leaderboard" },
  ];

  return (
    <section className="mb-8" aria-labelledby="fixture-experience-title">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t("illustrative.badge")}</p>
          <h2 id="fixture-experience-title" className="mt-1 text-xl">A look at the fixture experience</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Explore how fixtures, settled results and the community leaderboard come together.</p>
        </div>
        <div className="inline-flex w-full rounded-xl border border-border bg-muted/50 p-1 sm:w-auto" role="group" aria-label="Preview fixture experience">
          {views.map((item) => (
            <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)} className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none ${view === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[250px]" aria-live="polite" aria-atomic="true">
        {view === "fixtures" && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SAMPLE_FIXTURES.map((fixture, index) => (
              <article className="card-surface min-w-0 p-4" key={fixture.competition + fixture.home}>
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-primary">{t("sport." + fixture.sport)}</span><span className="truncate text-[10px] text-muted-foreground">{fixture.competition}</span></div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center"><TeamLogo team={fixture.home} size="lg" /><span className="line-clamp-2 text-xs font-semibold">{fixture.home}</span></div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">{t("vs")}</span>
                  <div className="flex min-w-0 flex-col items-center gap-2 text-center"><TeamLogo team={fixture.away} size="lg" /><span className="line-clamp-2 text-xs font-semibold">{fixture.away}</span></div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]"><span className="text-muted-foreground">{t("illustrative.fixtures.kickoff")}</span><span className="font-semibold tabular-nums">{fixture.time}</span></div>
                <span className="sr-only">{t("illustrative.badge")} {index + 1}</span>
              </article>
            ))}
          </div>
        )}
        {view === "results" && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { home: "Orlando Pirates", away: "Kaizer Chiefs", score: "2–1", competition: "Betway Premiership", date: "Full time" },
              { home: "Arsenal", away: "Liverpool", score: "1–1", competition: "Premier League", date: "Full time" },
              { home: "South Africa", away: "New Zealand", score: "24–18", competition: "International Rugby", date: "Full time" },
            ].map((result) => (
              <article className="card-surface p-4" key={result.competition}>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{result.competition}</span><span className="font-bold uppercase tracking-wide text-primary">{result.date}</span></div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <div className="flex flex-col items-center gap-2"><TeamLogo team={result.home} size="lg" /><span className="text-xs font-semibold">{result.home}</span></div>
                  <span className="text-xl font-bold tabular-nums">{result.score}</span>
                  <div className="flex flex-col items-center gap-2"><TeamLogo team={result.away} size="lg" /><span className="text-xs font-semibold">{result.away}</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
        {view === "leaderboard" && (
          <div className="card-surface overflow-hidden">
            <div className="border-b border-border p-4"><p className="text-sm font-semibold">Weekly leaderboard</p><p className="mt-1 text-xs text-muted-foreground">Illustrative member performance · sample data only</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b border-border text-left text-[11px] text-muted-foreground"><th className="px-4 py-3 font-medium">Rank</th><th className="px-4 py-3 font-medium">Tipster</th><th className="px-4 py-3 font-medium">Units</th><th className="px-4 py-3 font-medium">ROI</th><th className="px-4 py-3 font-medium">Picks</th></tr></thead><tbody>{SAMPLE_LEADERS.map((member, index) => <tr key={member.name} className="border-b border-border last:border-0"><td className="px-4 py-3 tabular-nums">{index + 1}</td><td className="px-4 py-3 font-semibold">{member.name}</td><td className="px-4 py-3 font-semibold text-primary tabular-nums">{member.units}</td><td className="px-4 py-3 tabular-nums">{member.roi}</td><td className="px-4 py-3 tabular-nums">{member.picks}</td></tr>)}</tbody></table></div>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Preview content is illustrative and does not represent live fixtures, results or member rankings.</p>
    </section>
  );
}
