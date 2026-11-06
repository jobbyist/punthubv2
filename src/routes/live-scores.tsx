import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarClock } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/live-scores")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/live-scores" }],
    meta: [
      { title: "Live Scores | Puntr" },
      { name: "description", content: "The Puntr live scores destination. Follow verified fixture and result updates as live score coverage is introduced." },
    ],
  }),
  component: LiveScoresPage,
});

function LiveScoresPage() {
  return (
    <AppShell>
      <PageHeading title="Live Scores" subtitle="A dedicated matchday destination is being built for Puntr." />
      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-5 sm:p-6">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><Activity className="size-4" /> Match centre</span>
          <h2 className="mt-3 text-xl font-bold">Live score coverage is coming</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">This page is the home for future live match updates. Live scores are not currently available here, and we will not display sample scores as if they were happening now.</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="border border-border p-4">
            <CalendarClock className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">Fixtures and results</h3>
            <p className="mt-1 text-sm text-muted-foreground">Check the Results area for available fixture and completed-result information.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/results">View results</Link></Button>
          </div>
          <div className="border border-border p-4">
            <Activity className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">Built around reliable data</h3>
            <p className="mt-1 text-sm text-muted-foreground">Live status and score updates will only appear once a verified data source is connected and operational.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/feedback">Suggest a feature</Link></Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
