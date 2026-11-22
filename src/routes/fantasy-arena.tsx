import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crown, Flame, Swords, Trophy, Users } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";

export const Route = createFileRoute("/fantasy-arena")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/fantasy-arena" }],
    meta: [
      { title: "Fantasy Arena | Puntr" },
      { name: "description", content: "Fantasy Arena is Puntr's upcoming fantasy-style sports competition experience, built around community leagues, head-to-head duels and seasonal leaderboards." },
    ],
  }),
  component: FantasyArenaPage,
});

function FantasyArenaPage() {
  return (
    <AppShell>
      <PageHeading art="pitch" title="Fantasy Arena" subtitle="A new arena for your sports knowledge. Compete with your community, take on rivals and build a season-long record." />
      <div className="mx-auto max-w-5xl space-y-7">
        <section className="relative overflow-hidden border border-primary/30 bg-card p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/15 blur-3xl" />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.18em] text-primary">In development · Fantasy Arena v3.0</p>
          <h2 className="relative mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">The game behind the game.</h2>
          <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Fantasy Arena is the next evolution of Puntr's simulation and competition experience. It is being developed as a dedicated product, with fantasy-style leagues, head-to-head challenges and seasonal competition built around sports knowledge and community participation.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/join">Join Puntr <ArrowRight className="ml-2 size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/roadmap">Explore the roadmap</Link></Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Community leagues", body: "Join structured competitions and measure your performance against other members." },
            { icon: Swords, title: "Head-to-head duels", body: "Challenge another member in a direct contest built around agreed competition rules." },
            { icon: Trophy, title: "Seasonal leaderboards", body: "Track progress across a season and see where you stand as the competition unfolds." },
            { icon: Flame, title: "Matchday momentum", body: "Bring fixture-by-fixture decisions together into a wider competition experience." },
            { icon: Crown, title: "Earn recognition", body: "Build a visible record and earn community recognition for consistent performance." },
            { icon: Users, title: "Built for participation", body: "A social sports experience designed to reward knowledge, consistency and fair play." },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-surface p-5">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">What is available today?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The existing Practice Mode is a separate simulation for eligible Founding Members. It uses fictional teams, simulated results and demo points with no cash value. Fantasy Arena v3.0 is a planned product release and is not yet available. We will publish its final rules, eligibility and launch details before opening access.
          </p>
          <div className="mt-4"><Button asChild variant="outline"><Link to="/practice">Explore current Practice Mode</Link></Button></div>
        </section>
        <RgNotice variant="compact" />
      </div>
    </AppShell>
  );
}
