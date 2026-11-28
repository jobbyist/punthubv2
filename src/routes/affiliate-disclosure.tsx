import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { AffiliateDisclosureAf } from "@/content/legal/af/affiliate-disclosure";
import { useLocale } from "@/lib/i18n/provider";

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
  const { locale } = useLocale();
  if (locale === "af") return <AffiliateDisclosureAf />;
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Affiliate disclosure"
        subtitle="How advertising and affiliate links work, and how commercial relationships are kept separate from predictions and rankings."
      />
      <div className="card-surface space-y-4 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
        <p>
          Puntr South Africa is operated by Gravitas Industries (Pty) Ltd (CK No.: 2024/596436/07),
          a company registered in South Africa.
        </p>
        <p>
          Puntr may earn a commission if you click a partner link and sign up with that partner.
          Every partner banner, card, text link and full-screen advertisement is labelled
          &quot;Sponsored&quot; or &quot;Advertisement&quot;. A partner appears only after we have
          checked it holds the licence it needs, and its copy and images are the ones the partner
          approved. A full-screen advertisement appears rarely, can be closed at once and closes by
          itself after a few seconds.
        </p>
        <p>
          Bookmaker profiles in the{" "}
          <a className="underline" href="/bookmakers">
            bookmaker directory
          </a>{" "}
          show a sign-up link only for live partners, labelled &quot;Ad&quot; and revealed after you
          confirm you are 18+. The rest of each profile (licence, payment methods, popularity and
          member ratings) is the same whether or not the bookmaker is a partner, and lists its
          sources. Where a partner holds only a foreign licence and is not on the National Gambling
          Board register (currently 1xBet, licensed in Curaçao), its profile says so and warns that
          online betting with it may not be lawful in your province.
        </p>
        <p>
          Partner links never contain your name, email or any other personal information. Click
          tracking is switched on only if you accept it in{" "}
          <a className="underline" href="/cookies">
            Privacy choices
          </a>
          . Ads are not shown to anyone who has not confirmed they are 18+ or who is on a break.
          Puntr Pro members browse ad-free: no sponsored placements are shown to them.
        </p>
        <p>
          Some rewards you can redeem with PuntPoints are funded by partners. Sponsored rewards say
          who sponsors them. Betting vouchers, if we offer them, are partner promotions: they are
          labelled &quot;Ad&quot;, shown only to members who are 18+ and not on a break, and carry
          the responsible-gambling message. Partners do not receive your personal information.
        </p>
        <p>
          Puntr also operates a separate member referral programme. Approved referrers may earn
          10–30% recurring commission on eligible Puntr Pro subscription revenue when a referred
          member becomes a paying Pro subscriber. This commission relates to Puntr subscriptions,
          not bookmaker deposits, stakes, losses or winnings. Rates, attribution and payment terms
          are governed by the approved referral programme agreement. See the{" "}
          <a className="underline" href="/referrals">
            referral programme
          </a>
          .
        </p>
        <p>
          Commercial partners do not control or influence Puntr’s picks, results, prediction
          assessments, editorial content or leaderboards.
        </p>
        <p className="text-xs">
          18+ only. T&amp;Cs apply. Gambling can be addictive. Helpline: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
