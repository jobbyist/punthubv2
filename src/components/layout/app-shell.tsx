import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, CalendarDays, ChevronLeft, LifeBuoy, PanelLeft, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AffiliateBanner } from "@/components/affiliate";
import { BookmakerIndependenceNotice } from "@/components/bookmaker-independence-notice";
import { LiveBadge } from "@/components/live-badge";
import { Button } from "@/components/ui/button";
import { sports } from "@/lib/mock-data";
import { useAsync } from "@/hooks/use-async";
import { formatUnits } from "@/lib/format";
import { fetchLiveFixtures } from "@/lib/fixtures";
import { fetchThisWeeksLeaders } from "@/lib/records";

const sideNav = [
  { key: "fixtures", to: "/fixtures", icon: CalendarDays },
  { key: "results", to: "/results", icon: Activity },
  { key: "leaderboards", to: "/leaderboard", icon: Trophy },
  { key: "support", to: "/support", icon: LifeBuoy },
] as const;

const SPORT_KEYS: Record<string, string> = {
  Soccer: "soccer",
  Rugby: "rugby",
  Basketball: "basketball",
  Tennis: "tennis",
  Cricket: "cricket",
  "Combat sports": "combat",
  Athletics: "athletics",
  "Horse racing": "racing",
};

function LeftRail() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const [collapsed, setCollapsed] = useState(false);
  const sportName = (name: string) => t(`sport.${SPORT_KEYS[name] ?? "soccer"}`);
  return (
    <aside className={`hidden shrink-0 border-r border-border py-6 pr-3 transition-[width] duration-200 lg:block ${collapsed ? "w-16" : "w-[220px] pr-5"}`}>
      <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "justify-end"}`}>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? t("side.expandNavigation") : t("side.collapseNavigation")}
          aria-expanded={!collapsed}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeft className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
      <nav className="space-y-1" aria-label={t("side.navigation")}>
        {sideNav.map(({ key, to, icon: Icon }) => (
          <Link
            key={key}
            to={to}
            title={collapsed ? t(`side.${key}`) : undefined}
            aria-label={collapsed ? t(`side.${key}`) : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Icon className="size-[18px] shrink-0 text-muted-foreground" />
            {!collapsed && <span className="flex-1">{t(`side.${key}`)}</span>}
          </Link>
        ))}
      </nav>
      {!collapsed && (
        <>
          <p className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("side.sports")}
          </p>
          <ul className="mt-2 space-y-0.5">
            {sports.map((s) => (
              <li key={s.name}>
                {s.active ? (
                  <Link
                    to="/sports/$sport"
                    params={{ sport: SPORT_KEYS[s.name] ?? "soccer" }}
                    className="flex flex-col items-start gap-0.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span>{sportName(s.name)}</span>
                    {s.name === "Soccer" && <LiveBadge />}
                  </Link>
                ) : (
                  <Link
                    to="/sports/$sport"
                    params={{ sport: SPORT_KEYS[s.name] ?? "soccer" }}
                    className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span>{sportName(s.name)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      {tc("badge.comingSoon")}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

export function RightRail() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const { data: leaders } = useAsync(() => fetchThisWeeksLeaders(5), []);
  const { data: live } = useAsync(() => fetchLiveFixtures(), []);
  return (
    <aside className="hidden w-[280px] shrink-0 space-y-5 py-6 xl:block">
      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm">{t("side.topTipsters")}</h4>
          <Link to="/leaderboards" className="text-xs font-medium text-primary">
            {tc("action.viewLeaderboard")}
          </Link>
        </div>
        {(leaders ?? []).length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t("side.noLeaders")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(leaders ?? []).map((tp, i) => (
              <li key={tp.user_id} className="flex items-center gap-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold tnum ${
                    i === 0
                      ? "bg-[oklch(0.85_0.16_90)] text-ink"
                      : i === 1
                        ? "bg-muted text-foreground"
                        : i === 2
                          ? "bg-[oklch(0.85_0.08_50)] text-ink"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <Link
                  to="/u/$username"
                  params={{ username: tp.username }}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {tp.username}
                </Link>
                <span className="text-xs font-semibold text-primary tnum">
                  {t("side.units", { units: formatUnits(tp.units) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm">{t("side.liveNow")}</h4>
        </div>
        {(live ?? []).length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t("side.noLive")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {(live ?? []).map((e) => (
              <li key={e.id}>
                <Link
                  to="/match/$fixtureId"
                  params={{ fixtureId: e.id }}
                  className="flex items-center gap-3"
                >
                  <span className="size-7 shrink-0 rounded-full bg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">{e.competition}</p>
                    <p className="truncate text-sm">{e.home}</p>
                    <p className="truncate text-sm">{e.away}</p>
                  </div>
                  <span className="bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {t("side.inPlay")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link to="/results">{tc("action.viewResults")}</Link>
        </Button>
      </div>
    </aside>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl sm:text-[34px]">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1400px] gap-7 px-4 sm:px-6">
      <LeftRail />
      <main className="min-w-0 flex-1 py-6">
        {children}
        <div className="mt-6">
          <BookmakerIndependenceNotice compact />
        </div>
        <div className="mt-6">
          <AffiliateBanner />
        </div>
      </main>
      <RightRail />
    </div>
  );
}

export { Trophy };
