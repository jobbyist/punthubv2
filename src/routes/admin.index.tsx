import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { RequireMember } from "@/components/account-gate";
import {
  FixturesTab,
  ReportsTab,
  SettlementTab,
  UsersTab,
  WaitlistTab,
} from "@/components/admin/admin-tabs";
import { useSession } from "@/components/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin | Puntr" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

const TABS = ["fixtures", "settlement", "reports", "users", "waitlist"] as const;

/** The database and every server function re-check the role; hiding the UI is only a convenience. */
function Admin() {
  const { t } = useTranslation("admin");
  const { isAdmin } = useSession();
  return (
    <RequireMember>
      {() => (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl">{t("title")}</h1>
          {!isAdmin ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("forbidden")}</p>
          ) : (
            <Tabs defaultValue="fixtures" className="mt-6">
              <TabsList className="flex h-auto flex-wrap justify-start">
                {TABS.map((k) => (
                  <TabsTrigger key={k} value={k}>
                    {t(`tabs.${k}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="fixtures" className="mt-5">
                <FixturesTab />
              </TabsContent>
              <TabsContent value="settlement" className="mt-5">
                <SettlementTab />
              </TabsContent>
              <TabsContent value="reports" className="mt-5">
                <ReportsTab />
              </TabsContent>
              <TabsContent value="users" className="mt-5">
                <UsersTab />
              </TabsContent>
              <TabsContent value="waitlist" className="mt-5">
                <WaitlistTab />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </RequireMember>
  );
}
