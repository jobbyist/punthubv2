import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

/** Plain layout for account screens. No rails and no ad slots: affiliate units never appear here. */
export function AccountPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">{children}</div>;
}

/** Renders children only for a signed-in member with a profile. */
export function RequireMember({
  children,
}: {
  children: (p: NonNullable<ReturnType<typeof useSession>["profile"]>) => ReactNode;
}) {
  const { t } = useTranslation("account");
  const { loading, profile } = useSession();
  if (loading) return <AccountPage>{null}</AccountPage>;
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
