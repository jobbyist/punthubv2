import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  LifeBuoy,
  PanelLeft,
  Trophy,
  Swords,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AffiliateBanner } from "@/components/affiliate";
import { PageArt, type PageArtKind } from "@/components/motion/page-art";
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
  { key: "duels", to: "/duels", icon: Swords },
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
    <aside
      className={`hidden shrink-0 border-r border-border py-6 pr-3 transition-[width] duration-200 lg:block ${collapsed ? "w-16" : "w-[220px] pr-5"}`}
    >
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
            activeProps={{ className: "bg-primary-soft text-primary" }}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted ${collapsed ? "justify-center px-2" : ""}`}
          >
            <Icon className="size-[18px] shrink-0 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-primary" />
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
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <span>{sportName(s.name)}</span>
                    {s.name === "Soccer" && <LiveBadge />}
                  </Link>
                ) : (
                  <Link
                    to="/sports/$sport"
                    params={{ sport: SPORT_KEYS[s.name] ?? "soccer" }}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

/**
 * Page banner. With `art` it becomes a branded panel: dotted backdrop, a green rule that draws in, and one of the
 * custom motion graphics from components/motion/page-art. Text is in the server HTML and never waits for script.
 */
export function PageHeading({
  title,
  subtitle,
  art,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  art?: PageArtKind;
  eyebrow?: string;
}) {
  if (!art) {
    return (
      <div className="mb-8 puntr-rise">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-[34px]">{title}</h1>
        <span className="puntr-grow-x mt-3 block h-1 w-14 rounded-full bg-primary" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
    );
  }
  return (
    <div className="relative isolate mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
      <div
        className="dot-grid absolute inset-0 -z-10 opacity-70"
        style={{
          maskImage: "linear-gradient(100deg, transparent 20%, black 85%)",
          WebkitMaskImage: "linear-gradient(100deg, transparent 20%, black 85%)",
        }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-4 p-5 sm:gap-8 sm:p-7">
        <div className="min-w-0 flex-1 puntr-rise">
          {eyebrow && (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="pr-24 text-[28px] leading-tight min-[480px]:pr-0 sm:text-[34px]">
            {title}
          </h1>
          <span className="puntr-grow-x mt-3 block h-1 w-14 rounded-full bg-primary" />
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <PageArt
          kind={art}
          className="absolute right-3 top-3 h-14 w-[5.5rem] opacity-80 min-[480px]:static min-[480px]:h-28 min-[480px]:w-44 min-[480px]:shrink-0 min-[480px]:opacity-100 sm:h-36 sm:w-56"
        />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1400px] gap-7 px-4 sm:px-6">
      <LeftRail />
      <main className="min-w-0 flex-1 py-6 sm:py-8">
        {children}
        <div className="mt-10">
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
