import { Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  Flame,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { AffiliateBanner } from "@/components/affiliate";
import { Button } from "@/components/ui/button";
import { liveNow, sports, topTipsters } from "@/lib/mock-data";

const sideNav = [
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Top Picks", to: "/predictions", icon: Star },
  { label: "Live Now", to: "/results", icon: Activity },
  { label: "Popular", to: "/predictions", icon: Flame },
  { label: "Community", to: "/community", icon: Users },
  { label: "Events Calendar", to: "/results", icon: CalendarDays },
] as const;

function LeftRail() {
  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-border py-6 pr-5 lg:block">
      <nav className="space-y-1">
        {sideNav.map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Icon className="size-[18px] text-muted-foreground" />
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sports</p>
      <ul className="mt-2 space-y-0.5">
        {sports.map((s) => (
          <li key={s.name}>
            {s.active ? (
              <Link
                to="/predictions"
                className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span>{s.name}</span>
              </Link>
            ) : (
              <span className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
                <span>{s.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">Coming soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>

    </aside>
  );
}

export function RightRail() {
  return (
    <aside className="hidden w-[280px] shrink-0 space-y-5 py-6 xl:block">
      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm">
            Top Tipsters
            <span className="bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Example</span>
          </h4>
          <Link to="/leaderboards" className="text-xs font-medium text-primary">
            View leaderboard
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {topTipsters.slice(0, 5).map((t) => (
            <li key={t.name} className="flex items-center gap-3">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold tnum ${
                  t.rank === 1
                    ? "bg-[oklch(0.85_0.16_90)] text-ink"
                    : t.rank === 2
                      ? "bg-muted text-foreground"
                      : t.rank === 3
                        ? "bg-[oklch(0.85_0.08_50)] text-ink"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {t.rank}
              </span>
              <span className="size-7 shrink-0 rounded-full bg-muted" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
              <span className="text-xs font-semibold text-primary tnum">{t.points.toLocaleString()} PP</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm">Live Now</h4>
          <span className="bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Example</span>
        </div>
        <ul className="mt-3 space-y-3">
          {liveNow.map((e) => (
            <li key={e.home} className="flex items-center gap-3">
              <span className="size-7 shrink-0 rounded-full bg-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">{e.league}</p>
                <p className="truncate text-sm">{e.home}</p>
                <p className="truncate text-sm">{e.away}</p>
              </div>
              <div className="text-right text-sm font-semibold tnum">
                <p>{e.hs}</p>
                <p>{e.as}</p>
              </div>

            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link to="/results">View results</Link>
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
          <AffiliateBanner />
        </div>
      </main>
      <RightRail />
    </div>
  );
}

export { Trophy };
