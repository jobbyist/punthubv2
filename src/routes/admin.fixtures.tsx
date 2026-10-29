import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AccountPage, RequireMember } from "@/components/account-gate";
import { FixtureCsvImport } from "@/components/admin/fixture-csv-import";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/admin/fixtures")({
  head: () => ({
    meta: [{ title: "Fixtures | Puntr admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminFixtures,
});

/** Temporary home for the CSV import. P11 moves it into the /admin Fixtures tab. The server re-checks the role. */
function AdminFixtures() {
  const { t } = useTranslation("admin");
  const { isAdmin } = useSession();
  return (
    <RequireMember>
      {() => (
        <AccountPage>
          <h1 className="text-3xl">{t("fixtures.title")}</h1>
          {isAdmin ? (
            <div className="mt-6">
              <FixtureCsvImport />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("forbidden")}</p>
          )}
        </AccountPage>
      )}
    </RequireMember>
  );
}
