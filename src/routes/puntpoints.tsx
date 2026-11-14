import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gift, Star } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/puntpoints")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/puntpoints" }],
    meta: [
      { title: "PuntPoints | Puntr" },
      {
        name: "description",
        content:
          "Discover PuntPoints, Puntr's activity-based loyalty points and member rewards programme.",
      },
    ],
  }),
  component: PuntPointsPage,
});

function PuntPointsPage() {
  return (
    <AppShell>
      <PageHeading
        art="coins"
        title="PuntPoints"
        subtitle="A little recognition for being part of the Puntr community."
      />
      <section className="card-surface p-5 sm:p-7">
        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Star className="size-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Points for participation. Never for outcomes.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          PuntPoints are designed to recognise eligible community activity, such as confirming your
          email, sharing picks and inviting friends. They are not a stake, a betting balance or a
          reward for winning.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [
              "Earn through activity",
              "Eligible actions can earn points under published programme rules.",
            ],
            [
              "Explore member rewards",
              "Redeem points for available partner perks when the programme is enabled.",
            ],
            [
              "Keep it transparent",
              "Points have no cash value and cannot be bought or exchanged for money.",
            ],
          ].map(([title, body]) => (
            <div key={title} className="border border-border p-4">
              <Gift className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Availability, earning rules and rewards depend on programme status and eligibility. Points
          do not affect pick grading or leaderboard rankings.
        </p>
        <Button asChild className="mt-5">
          <Link to="/rewards">
            Open rewards <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}
