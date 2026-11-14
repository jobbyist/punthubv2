import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PageArt, type PageArtKind } from "@/components/motion/page-art";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

/** Plain layout for account screens. No rails and no ad slots: affiliate units never appear here. */
export function AccountPage({
  children,
  art = "shield",
}: {
  children: ReactNode;
  art?: PageArtKind;
}) {
  return (
    <div className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <PageArt
        kind={art}
        className="absolute right-4 top-6 hidden h-20 w-32 opacity-80 sm:right-6 sm:block"
      />
      <div className="puntr-rise relative">{children}</div>
    </div>
  );
}

/** Placeholder while the session loads, so account screens never flash an empty page. */
function AccountSkeleton() {
  return (
    <AccountPage>
      <div className="space-y-4" aria-hidden="true">
        <div className="puntr-shimmer h-8 w-48 rounded-md" />
        <div className="puntr-shimmer h-4 w-72 max-w-full rounded-md" />
        <div className="puntr-shimmer h-32 w-full rounded-xl" />
        <div className="puntr-shimmer h-32 w-full rounded-xl" />
      </div>
    </AccountPage>
  );
}

/** Renders children only for a signed-in member with a profile. */
export function RequireMember({
  children,
}: {
  children: (p: NonNullable<ReturnType<typeof useSession>["profile"]>) => ReactNode;
}) {
  const { t } = useTranslation("account");
  const { loading, profile } = useSession();
  if (loading) return <AccountSkeleton />;
  if (!profile) {
    return (
      <AccountPage>
        <h1 className="text-2xl">{t("signInNeeded.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("signInNeeded.body")}</p>
        <Button asChild className="mt-4">
          <Link to="/join">{t("signInNeeded.cta")}</Link>
        </Button>
      </AccountPage>
    );
  }
  return <>{children(profile)}</>;
}
