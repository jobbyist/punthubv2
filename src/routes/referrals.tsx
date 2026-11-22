import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Share2, Users } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/referrals")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pages");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/referrals" }],
      meta: [
        { title: t("referrals.meta.title") },
        { name: "description", content: t("referrals.meta.description") },
      ],
    };
  },
  component: ReferralsPage,
});

function ReferralsPage() {
  const { isSignedIn, profile } = useSession();
  const { t } = useTranslation("pages");
  return (
    <AppShell>
      <PageHeading art="gift" title={t("referrals.title")} subtitle={t("referrals.subtitle")} />
      <section className="card-surface p-5 sm:p-7">
        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Share2 className="size-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">{t("referrals.heading")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("referrals.body")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-border p-4">
            <Users className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("referrals.invite.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("referrals.invite.body")}</p>
          </div>
          <div className="border border-border p-4">
            <ArrowRight className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("referrals.track.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("referrals.track.body")}</p>
          </div>
        </div>
      </section>

      <section className="card-surface mt-5 border-primary/40 p-5 sm:p-7" aria-labelledby="referral-commission-title">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Puntr Pro referral programme</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
          <h2 id="referral-commission-title" className="font-display text-4xl font-black tracking-tight">10–30%</h2>
          <p className="pb-1 text-sm font-semibold text-muted-foreground">recurring commission</p>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Earn 10–30% recurring commission on eligible Puntr Pro subscription revenue when someone you refer becomes a paying Pro subscriber. Your approved commission rate is confirmed when you are accepted into the programme and applies to eligible subscription billing periods while the referred member remains an active paying subscriber, subject to the programme agreement.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border border-border p-4">
            <h3 className="font-semibold">What qualifies?</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">A new member who joins through your referral and goes on to subscribe to Puntr Pro. A free sign-up alone does not generate Pro subscription commission.</p>
          </div>
          <div className="border border-border p-4">
            <h3 className="font-semibold">What is not commissionable?</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Bookmaker deposits, bets, stakes, losses, winnings and gambling activity are never part of Puntr referral commissions.</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Commission rates, attribution, qualifying events, reversals, reporting and payment terms are governed by the approved referral programme terms. Commission reporting may be made available separately from the member invite activity shown below.
        </p>
        <Link to="/brand-ambassadors" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">
          Interested in a wider partnership? Explore the Brand Ambassador Programme <ArrowRight className="size-4" />
        </Link>
      </section>

      {isSignedIn && profile?.referral_code ? (
        <ReferralCard />
      ) : (
        <section className="card-surface mt-5 p-5">
          <h2 className="font-semibold">{t("referrals.guest.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("referrals.guest.body")}</p>
          <Button asChild className="mt-4">
            <Link to="/join">{t("referrals.guest.cta")}</Link>
          </Button>
        </section>
      )}
    </AppShell>
  );
}
