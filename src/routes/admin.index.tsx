import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { RequireMember } from "@/components/account-gate";
import {
  FixturesTab,
  ReportsTab,
  SettlementTab,
  UsersTab,
  WaitlistTab,
} from "@/components/admin/admin-tabs";
import { AffiliatesTab } from "@/components/admin/affiliates-admin";
import { AnnualPassTab } from "@/components/admin/annual-pass-admin";
import { CampaignsTab } from "@/components/admin/campaigns-admin";
import { IdentityTab } from "@/components/admin/identity-admin";
import { MembersTab } from "@/components/admin/members-admin";
import { NewsroomTab } from "@/components/admin/newsroom-admin";
import { NotificationsTab } from "@/components/admin/notifications-admin";
import { ActionLogTab, AnalyticsTab, SystemTab } from "@/components/admin/system-admin";
import { PracticeDrawTab } from "@/components/admin/practice-draw-admin";
import { NotificationBanner } from "@/components/admin/launch-panel";
import { EndorsementsTab } from "@/components/admin/endorsements-admin";
import { LogosTab } from "@/components/admin/logos-admin";
import { QuestsTab } from "@/components/admin/quests-admin";
import { RewardsTab } from "@/components/admin/rewards-admin";
import { TranslationsTab } from "@/components/admin/translations-admin";
import { useSession } from "@/components/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin | Puntr" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

const TABS = [
  "system",
  "users",
  "newsroom",
  "notifications",
  "analytics",
  "log",
  "fixtures",
  "settlement",
  "reports",
  "identity",
  "rewards",
  "quests",
  "waitlist",
  "campaigns",
  "annualPass",
  "affiliates",
  "draw",
  "logos",
  "endorsements",
  "translations",
] as const;

/** The database and every server function re-check the role; hiding the UI is only a convenience. */
function Admin() {
  const { t } = useTranslation("admin");
  const { isAdmin } = useSession();
  const [tab, setTab] = useState<string>("system");
  return (
    <RequireMember>
      {() => (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl">{t("title")}</h1>
          {!isAdmin ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("forbidden")}</p>
          ) : (
            <>
              <NotificationBanner onOpenAudience={() => setTab("waitlist")} />
              <Tabs value={tab} onValueChange={setTab} className="mt-6">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  {TABS.map((k) => (
                    <TabsTrigger key={k} value={k}>
                      {t(`tabs.${k}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="system" className="mt-5">
                  <SystemTab />
                </TabsContent>
                <TabsContent value="newsroom" className="mt-5">
                  <NewsroomTab />
                </TabsContent>
                <TabsContent value="notifications" className="mt-5">
                  <NotificationsTab />
                </TabsContent>
                <TabsContent value="analytics" className="mt-5">
                  <AnalyticsTab />
                </TabsContent>
                <TabsContent value="log" className="mt-5">
                  <ActionLogTab />
                </TabsContent>
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
                  <MembersTab />
                  <div className="mt-5">
                    <UsersTab />
                  </div>
                </TabsContent>
                <TabsContent value="identity" className="mt-5">
                  <IdentityTab />
                </TabsContent>
                <TabsContent value="rewards" className="mt-5">
                  <RewardsTab />
                </TabsContent>
                <TabsContent value="quests" className="mt-5">
                  <QuestsTab />
                </TabsContent>
                <TabsContent value="waitlist" className="mt-5">
                  <WaitlistTab />
                </TabsContent>
                <TabsContent value="campaigns" className="mt-5">
                  <CampaignsTab />
                </TabsContent>
                <TabsContent value="annualPass" className="mt-5">
                  <AnnualPassTab />
                </TabsContent>
                <TabsContent value="affiliates" className="mt-5">
                  <AffiliatesTab />
                </TabsContent>
                <TabsContent value="endorsements" className="mt-5">
                  <EndorsementsTab />
                </TabsContent>
                <TabsContent value="logos" className="mt-5">
                  <LogosTab />
                </TabsContent>
                <TabsContent value="translations" className="mt-5">
                  <TranslationsTab />
                </TabsContent>
                <TabsContent value="draw" className="mt-5">
                  <PracticeDrawTab />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}
    </RequireMember>
  );
}
