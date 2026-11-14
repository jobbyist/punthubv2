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
