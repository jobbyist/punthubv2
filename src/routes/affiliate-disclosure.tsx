import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";

export const Route = createFileRoute("/affiliate-disclosure")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/affiliate-disclosure" }],
    meta: [
      { title: "Affiliate Disclosure | Puntr" },
      {
        name: "description",
        content: "How Puntr earns from partner links, and what we never share.",
      },
    ],
  }),
  component: AffiliateDisclosure,
});

function AffiliateDisclosure() {
  return (
    <AppShell>
      <PageHeading title="Affiliate disclosure" subtitle="How partner links work on Puntr." />
      <div className="card-surface space-y-4 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
        <p>
          Puntr may earn a commission if you click a partner link and sign up with that partner.
          Every such link is labelled &quot;Ad&quot;. A partner appears only after we have checked
          it holds the licence it needs.
        </p>
        <p>
          Partner links never contain your name, email or any other personal information. Click
          tracking is switched on only if you accept it in{" "}
          <a className="underline" href="/cookies">
            Privacy choices
          </a>
          . Ads are not shown to anyone who has not confirmed they are 18+ or who is on a break.
        </p>
        <p>
          Some rewards you can redeem with PuntPoints are funded by partners. Sponsored rewards say
          who sponsors them. Betting vouchers, if we offer them, are partner promotions: they are
          labelled &quot;Ad&quot;, shown only to members who are 18+ and not on a break, and carry
          the responsible-gambling message. Partners do not receive your personal information.
        </p>
        <p>Partners do not influence the picks, results or leaderboards on Puntr.</p>
        <p className="text-xs">
          18+ only. T&amp;Cs apply. Gambling can be addictive. Helpline: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
