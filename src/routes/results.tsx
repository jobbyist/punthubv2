import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { resultsByDate, resultsSummary } from "@/lib/mock-data";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results | Puntr" },
      {
        name: "description",
        content: "Check past match results, see how predictions performed and track your betting accuracy.",
      },
      { property: "og:title", content: "Results | Puntr" },
      { property: "og:description", content: "See how predictions performed and track your accuracy." },
    ],
  }),
  component: Results,
});

const perf: [string, string][] = [
  ["48", "Predictions"],
  ["31", "Correct"],
  ["64.6%", "Hit Rate"],
  ["+1 280 PP", "PuntPoints Earned"],
  ["7", "Win Streak"],
];

function Results() {
  return (
    <AppShell>
      <PageHeading title="Results" subtitle="Check past results, see how predictions performed and track your accuracy." />

      <div className="mb-6 flex flex-wrap gap-2">
        {["All Results", "Yesterday", "Today", "This Week", "This Month"].map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              i === 0 ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="card-surface mb-6 p-5">
        <h2 className="text-lg">
          Your Performance <span className="text-sm font-normal text-muted-foreground">(8 – 11 May 2025)</span>
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {perf.map(([v, l]) => (
            <div key={l} className="text-center">
              <p className={`font-display text-2xl font-extrabold tnum ${v.startsWith("+") ? "text-primary" : ""}`}>{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface overflow-hidden">
        <h2 className="p-5 pb-3 text-lg">Results by Date</h2>
        {resultsByDate.map((day) => (
          <div key={day.date}>
            <div className="flex flex-wrap items-center gap-3 border-y border-border bg-muted/40 px-5 py-3 text-sm">
              <span className="font-semibold">{day.date}</span>
              <span className="flex-1" />
              <span className="font-medium text-primary tnum">{day.correct} Correct</span>
              <span className="font-medium text-destructive tnum">{day.incorrect} Incorrect</span>
              <span className="font-semibold text-primary tnum">+{day.points} PP</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Match</th>
                    <th className="px-3 py-2.5 font-medium">Your Pick</th>
                    <th className="px-3 py-2.5 font-medium">Result</th>
                    <th className="px-3 py-2.5 font-medium">Odds</th>
                    <th className="px-3 py-2.5 font-medium">Outcome</th>
                    <th className="px-5 py-2.5 font-medium">PuntPoints</th>
                  </tr>
                </thead>
                <tbody>
                  {day.matches.map((m) => (
                    <tr key={m.match} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <p className="text-[11px] text-muted-foreground">{m.league}</p>
                        <p className="font-medium">{m.match}</p>
                      </td>
                      <td className="px-3 py-3">{m.pick}</td>
                      <td className="px-3 py-3 font-semibold tnum">{m.result}</td>
                      <td className="px-3 py-3 tnum">{m.odds.toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            m.ok ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {m.ok ? "Correct" : "Incorrect"}
                        </span>
                      </td>
                      <td className={`px-5 py-3 font-semibold tnum ${m.ok ? "text-primary" : "text-muted-foreground"}`}>
                        {m.ok ? "+60 PP" : "0 PP"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <ul>
          {resultsSummary.map((d) => (
            <li key={d.date} className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 text-sm">
              <span className="font-semibold">{d.date}</span>
              <span className="flex-1" />
              <span className="text-muted-foreground tnum">{d.matches} matches</span>
              <span className="text-primary tnum">{d.correct} Correct</span>
              <span className="text-destructive tnum">{d.incorrect} Incorrect</span>
              <span className="font-semibold text-primary tnum">+{d.points} PP</span>
              <Button variant="outline" size="sm">
                View matches
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
