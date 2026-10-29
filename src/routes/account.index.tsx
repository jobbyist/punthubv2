import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AccountPage, RequireMember } from "@/components/account-gate";
import { ReferralCard } from "@/components/referral-card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/account/")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "account");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/account" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: Account,
});

function Account() {
  const { t } = useTranslation("account");
  const { user } = useSession();
  return (
    <RequireMember>
      {(profile) => (
        <AccountPage>
          <h1 className="text-3xl">{t("home.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("home.subtitle", { email: user?.email ?? "" })}
          </p>

          <dl className="card-surface mt-6 divide-y divide-border">
            <div className="flex items-center justify-between gap-4 p-4 text-sm">
              <dt className="text-muted-foreground">{t("home.username")}</dt>
              <dd className="font-semibold">{profile.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 text-sm">
              <dt className="text-muted-foreground">
                {profile.founding_number
                  ? t("home.founding", { number: profile.founding_number })
                  : t("home.member")}
              </dt>
              <dd>
                <Link
                  to="/u/$username"
                  params={{ username: profile.username }}
                  className="text-primary underline"
                >
                  {t("home.recordLink")}
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-4 text-sm">
              <dt className="text-muted-foreground">{t("home.language")}</dt>
              <dd>
                <LanguageSwitcher />
              </dd>
            </div>
          </dl>

          <ReferralCard />

          <Link to="/rewards" className="card-surface mt-4 block p-4 hover:bg-muted/40">
            <p className="font-semibold">{t("home.rewardsLink")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.rewardsBody")}</p>
          </Link>

          <Link to="/account/security" className="card-surface mt-4 block p-4 hover:bg-muted/40">
            <p className="font-semibold">{t("home.securityLink")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.securityBody")}</p>
          </Link>

          <Link to="/account/privacy" className="card-surface mt-4 block p-4 hover:bg-muted/40">
            <p className="font-semibold">{t("home.privacyLink")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.privacyBody")}</p>
          </Link>
        </AccountPage>
      )}
    </RequireMember>
  );
}
