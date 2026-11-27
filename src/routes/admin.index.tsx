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
import { PushNotificationsAdmin } from "@/components/admin/push-notifications-admin";
import { ActionLogTab, AnalyticsTab, SystemTab } from "@/components/admin/system-admin";
import { PracticeDrawTab } from "@/components/admin/practice-draw-admin";
import { NotificationBanner } from "@/components/admin/launch-panel";
import { SyntheticExperimentTab } from "@/components/admin/synthetic-experiment-admin";
import { PfieLearningTab } from "@/components/admin/pfie-learning-admin";
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

const TAB_GROUPS = [
  { label: "Overview", items: ["system", "analytics", "synthetic", "pfieLearning", "log"] },
  { label: "Community", items: ["users", "waitlist", "notifications", "push", "reports"] },
  {
    label: "Growth & partnerships",
    items: ["newsroom", "campaigns", "annualPass", "affiliates", "endorsements", "draw"],
  },
  {
    label: "Platform",
    items: ["fixtures", "settlement", "identity", "rewards", "quests", "logos", "translations"],
  },
] as const;

/** The database and every server function re-check the role; hiding the UI is only a convenience. */
function Admin() {
  const { t } = useTranslation("admin");
  const { isAdmin } = useSession();
  const [tab, setTab] = useState<string>("system");
  const activeTab = TAB_GROUPS.flatMap((group) => group.items).find((item) => item === tab);

  return (
    <RequireMember>
      {() => (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Puntr / Control centre
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage members, operations, partnerships and platform settings.
              </p>
            </div>
            <a
              href="/admin/founding-hq"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/10"
            >
              Founding HQ <span aria-hidden="true">↗</span>
            </a>
            {isAdmin && (
              <a
                href="/dev"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-muted"
              >
                Dev workspace <span aria-hidden="true">↗</span>
              </a>
            )}
          </header>

          {!isAdmin ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("forbidden")}</p>
          ) : (
            <>
              <NotificationBanner onOpenAudience={() => setTab("waitlist")} />
              <Tabs
                orientation="vertical"
                value={tab}
                onValueChange={setTab}
                className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start"
              >
                <div className="min-w-0">
                  <label htmlFor="admin-section-select" className="sr-only">
                    Choose an admin section
                  </label>
                  <select
                    id="admin-section-select"
                    value={tab}
                    onChange={(event) => setTab(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 lg:hidden"
                  >
                    {TAB_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map((key) => (
                          <option key={key} value={key}>
                            {t(`tabs.${key}`)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <aside className="hidden lg:block">
                    <TabsList
                      aria-label="Admin sections"
                      className="flex h-auto w-full flex-col items-stretch gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                    >
                      {TAB_GROUPS.map((group) => (
                        <div key={group.label} className="space-y-1">
                          <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            {group.label}
                          </p>
                          {group.items.map((key) => (
                            <TabsTrigger
                              key={key}
                              value={key}
                              className="w-full justify-start rounded-lg px-3 py-2.5 text-left text-sm data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
                            >
                              {t(`tabs.${key}`)}
                            </TabsTrigger>
                          ))}
                        </div>
                      ))}
                    </TabsList>
                  </aside>
                </div>

                <main className="min-w-0">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Current section
                      </p>
                      <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
                        {activeTab ? t(`tabs.${activeTab}`) : t("title")}
                      </h2>
                    </div>
                    <span className="hidden rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                      Admin workspace
                    </span>
                  </div>

                  <TabsContent value="system" className="mt-0">
                    <SystemTab />
                  </TabsContent>
                  <TabsContent value="newsroom" className="mt-0">
                    <NewsroomTab />
                  </TabsContent>
                  <TabsContent value="notifications" className="mt-0">
                    <NotificationsTab />
                  </TabsContent>
                  <TabsContent value="push" className="mt-0">
                    <PushNotificationsAdmin />
                  </TabsContent>
                  <TabsContent value="analytics" className="mt-0">
                    <AnalyticsTab />
                  </TabsContent>
                  <TabsContent value="synthetic" className="mt-0">
                    <SyntheticExperimentTab />
                  </TabsContent>
                  <TabsContent value="pfieLearning" className="mt-0">
                    <PfieLearningTab />
                  </TabsContent>
                  <TabsContent value="log" className="mt-0">
                    <ActionLogTab />
                  </TabsContent>
                  <TabsContent value="fixtures" className="mt-0">
                    <FixturesTab />
                  </TabsContent>
                  <TabsContent value="settlement" className="mt-0">
                    <SettlementTab />
                  </TabsContent>
                  <TabsContent value="reports" className="mt-0">
                    <ReportsTab />
                  </TabsContent>
                  <TabsContent value="users" className="mt-0">
                    <MembersTab />
                    <div className="mt-5">
                      <UsersTab />
                    </div>
                  </TabsContent>
                  <TabsContent value="identity" className="mt-0">
                    <IdentityTab />
                  </TabsContent>
                  <TabsContent value="rewards" className="mt-0">
                    <RewardsTab />
                  </TabsContent>
                  <TabsContent value="quests" className="mt-0">
                    <QuestsTab />
                  </TabsContent>
                  <TabsContent value="waitlist" className="mt-0">
                    <WaitlistTab />
                  </TabsContent>
                  <TabsContent value="campaigns" className="mt-0">
                    <CampaignsTab />
                  </TabsContent>
                  <TabsContent value="annualPass" className="mt-0">
                    <AnnualPassTab />
                  </TabsContent>
                  <TabsContent value="affiliates" className="mt-0">
                    <AffiliatesTab />
                  </TabsContent>
                  <TabsContent value="endorsements" className="mt-0">
                    <EndorsementsTab />
                  </TabsContent>
                  <TabsContent value="logos" className="mt-0">
                    <LogosTab />
                  </TabsContent>
                  <TabsContent value="translations" className="mt-0">
                    <TranslationsTab />
                  </TabsContent>
                  <TabsContent value="draw" className="mt-0">
                    <PracticeDrawTab />
                  </TabsContent>
                </main>
              </Tabs>
            </>
          )}
        </div>
      )}
    </RequireMember>
  );
}
