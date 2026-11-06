import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Newspaper, Radio } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/newsroom")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/newsroom" }],
    meta: [
      { title: "Updates | Puntr Newsroom" },
      {
        name: "description",
        content: "Product announcements, platform updates and news from the Puntr team.",
      },
    ],
  }),
  component: NewsroomPage,
});

function NewsroomPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Radio className="size-3.5" /> From the Puntr team
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
            The Puntr <span className="text-primary">Newsroom.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Product announcements, launch notes and important updates from the team, all in one
            place.
          </p>
        </div>
        <section className="card-surface mt-9 p-6 sm:p-8">
          <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
            <Newspaper className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold">More updates are on the way</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            We are preparing the newsroom for product releases, feature announcements and community
            milestones. Check back as Puntr moves towards launch.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/about">
              Discover Puntr <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
