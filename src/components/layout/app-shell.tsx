import { Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Flame,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { AffiliateBanner } from "@/components/affiliate";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { liveNow, marketMovers, platforms, sports, topTipsters } from "@/lib/mock-data";

const sideNav = [
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Top Picks", to: "/predictions", icon: Star },
  { label: "Live Now", to: "/results", icon: Activity, badge: 12 },
  { label: "Popular", to: "/predictions", icon: Flame },
  { label: "Community", to: "/community", icon: Users },
  { label: "Events Calendar", to: "/results", icon: CalendarDays },
] as const;

function Sparkline({ up = true }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-full" aria-hidden="true">
      <polyline
        points="0,22 12,18 24,20 36,13 48,16 60,10 72,12 84,7 96,9 108,4 120,6"
        fill="none"
        stroke={up ? "var(--color-primary)" : "var(--color-destructive)"}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function LeftRail() {
  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-border py-6 pr-5 lg:block">
      <nav className="space-y-1">
        {sideNav.map(({ label, to, icon: Icon, ...rest }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Icon className="size-[18px] text-muted-foreground" />
            <span className="flex-1">{label}</span>
            {"badge" in rest && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary tnum">
                {rest.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <p className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sports</p>
      <ul className="mt-2 space-y-0.5">
        {sports.map((s) => (
          <li key={s.name}>
            <Link
              to="/predictions"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <span>{s.name}</span>
              <span className="text-xs text-muted-foreground tnum">{s.count}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-7 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Top platforms
      </p>
      <ul className="mt-2 space-y-0.5">
        {platforms.map((p) => (
          <li key={p} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink text-[9px] font-bold text-ink-foreground">
              {p.slice(0, 2).toUpperCase()}
            </span>
            {p}
          </li>
        ))}
        <li>
          <Link to="/pricing" className="flex items-center justify-between px-3 py-2 text-sm font-medium">
            View all platforms <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      </ul>

      <ReferCard />
    </aside>
  );
}

function ReferCard() {
  const { openEarlyAccess } = useSession();
  return (
    <div className="mt-7 rounded-xl border border-border bg-card p-4 shadow-soft">
      <h4 className="text-sm">Refer & Earn</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Refer users to premium platforms and earn 30% of their monthly subscription for as long as they remain active.
      </p>
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => openEarlyAccess()}>
        Invite & Earn
      </Button>
    </div>
  );
}

export function RightRail() {
  const { openEarlyAccess } = useSession();
  return (
    <aside className="hidden w-[280px] shrink-0 space-y-5 py-6 xl:block">
      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm">Top Tipsters</h4>
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
          <h4 className="text-sm">Market Movers</h4>
          <span className="text-xs text-muted-foreground">See what's moving</span>
        </div>
        <ul className="mt-3 space-y-4">
          {marketMovers.map((m) => (
            <li key={m.title}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.sub}</p>
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-primary tnum">
                  <TrendingUp className="size-3" /> {m.change}%
                </span>
              </div>
              <Sparkline />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-ink p-5 text-ink-foreground shadow-lift">
        <h4 className="text-lg leading-tight">Earn 30% Recurring Revenue</h4>
        <p className="mt-2 text-sm leading-relaxed text-ink-foreground/75">
          Refer users to premium platforms and earn 30% of their monthly subscription for as long as they remain
          active.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {["No limits on earnings", "Real-time tracking", "Monthly payouts"].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-success">✓</span> {f}
            </li>
          ))}
        </ul>
        <Button
          className="mt-5 w-full bg-background text-ink hover:bg-background/90"
          onClick={() => openEarlyAccess()}
        >
          Invite & Earn Now
        </Button>
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm">Live Now</h4>
          <span className="text-xs font-medium text-primary tnum">12 events live</span>
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
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Live
              </span>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
          <Link to="/results">View all live events</Link>
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
