import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Share2, Users } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/referrals")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/referrals" }],
    meta: [
      { title: "Refer a friend | Puntr" },
      {
        name: "description",
        content:
          "Invite friends to join Puntr and follow your referral activity from your member account.",
      },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { isSignedIn, profile } = useSession();
  return (
    <AppShell>
      <PageHeading title="Refer a friend" subtitle="Bring your sports community to Puntr." />
      <section className="card-surface p-5 sm:p-7">
        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Share2 className="size-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Share the game. Grow the community.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Invite friends to join Puntr, share sports conversations and build a public record of
          their picks. Referral tracking is tied to your member invite code.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-border p-4">
            <Users className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">Invite your people</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share your personal invite link by copying it or sending it on WhatsApp.
            </p>
          </div>
          <div className="border border-border p-4">
            <ArrowRight className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">Track eligible referrals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              See sign-ups and joined members from your account when referral data is available.
            </p>
          </div>
        </div>
      </section>
      {isSignedIn && profile?.referral_code ? (
        <ReferralCard />
      ) : (
        <section className="card-surface mt-5 p-5">
          <h2 className="font-semibold">Get your personal invite link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a free Puntr account or sign in to access your referral link and activity.
          </p>
          <Button asChild className="mt-4">
            <Link to="/join">Join or sign in</Link>
          </Button>
        </section>
      )}
    </AppShell>
  );
}
