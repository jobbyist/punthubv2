import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Menu,
  Target,
  Trophy,
  Users,
  X,
  Home,
  TrendingUp,
  HelpCircle,
  DollarSign,
  Info,
  Brain,
  Mic,
  Building2,
  Wrench,
  Radio,
  Star,
  UserPlus,
  Shield,
  Crown,
  MessageCircle,
  Share2,
  LogOut,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { useSession } from "@/components/session";

let setMenuOpenExternal: ((open: boolean) => void) | null = null;

const bottomNavItems = [
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "Community", to: "/community", icon: Users },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
] as const;

const sports = [
  { label: "Soccer", emoji: "⚽", to: "/predictions" },
  { label: "Basketball", emoji: "🏀", to: "/predictions" },
  { label: "Tennis", emoji: "🎾", to: "/predictions" },
  { label: "Rugby", emoji: "🏉", to: "/predictions" },
  { label: "Cricket", emoji: "🏏", to: "/predictions" },
  { label: "Boxing", emoji: "🥊", to: "/predictions" },
] as const;

export function MobileNav() {
  const { isGuest, exitGuest, openEarlyAccess } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(true);

  setMenuOpenExternal = setIsMenuOpen;

  const close = () => setIsMenuOpen(false);

  const NavLink = ({
    to,
    search,
    icon: Icon,
    label,
    badge,
    badgeColor = "bg-primary-soft text-primary",
    right,
    active: forceActive,
  }: {
    to?: string;
    search?: Record<string, string>;
    icon: ComponentType<{ className?: string }>;
    label: string;
    badge?: string;
    badgeColor?: string;
    right?: ReactNode;
    active?: boolean;
  }) => {
    const active = forceActive ?? (to ? path === to : false);
    const content = (
      <div
        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
          active ? "bg-primary-soft text-primary" : "text-foreground hover:bg-muted"
        }`}
      >
        <Icon className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeColor}`}>
            {badge}
          </span>
        )}
        {right}
      </div>
    );

    if (to) {
      return (
        <Link to={to} {...(search ? { search } : {})} onClick={close}>
          {content}
        </Link>
      );
    }
    return (
      <button type="button" onClick={close} className="w-full text-left">
        {content}
      </button>
    );
  };

  return (
    <>
      {/* Full Screen Menu Overlay matching mockup */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          {/* Header with logo + close */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Logo />
            <button
              onClick={close}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable menu content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <nav className="px-3 py-3">
              {/* Primary links */}
              <div className="space-y-0.5">
                <NavLink to="/" icon={Home} label="Home" active={path === "/"} />
                <NavLink to="/predictions" icon={Target} label="Predictions" />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "AI Picks (PUNT AI)" }}
                  icon={Brain}
                  label="AI Picks (PUNT AI)"
                  badge="PRO"
                  badgeColor="bg-primary/15 text-primary"
                />
                <NavLink to="/insights" icon={TrendingUp} label="Market Insights" />
                <NavLink to="/coming-soon" search={{ feature: "Podcast" }} icon={Mic} label="Podcast" />
              </div>

              {/* Sports section */}
              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setSportsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[15px] font-medium text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <Trophy className="size-5 text-muted-foreground" />
                    Sports
                  </span>
                  {sportsOpen ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>

                {sportsOpen && (
                  <div className="mt-2 grid grid-cols-4 gap-2 px-1 pb-2">
                    {sports.map((s) => (
                      <Link
                        key={s.label}
                        to={s.to}
                        onClick={close}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-1 py-3 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft"
                      >
                        <span className="text-xl leading-none">{s.emoji}</span>
                        <span className="text-[11px] font-medium text-foreground">{s.label}</span>
                      </Link>
                    ))}
                    <Link
                      to="/predictions"
                      onClick={close}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-1 py-3 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft"
                    >
                      <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        ···
                      </span>
                      <span className="text-[11px] font-medium text-foreground">More</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Tools & services */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Bookmakers" }}
                  icon={Building2}
                  label="Bookmakers"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Betting Tools" }}
                  icon={Wrench}
                  label="Betting Tools"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Live Scores" }}
                  icon={Radio}
                  label="Live Scores"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Rewards & community */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "PuntPoints" }}
                  icon={Star}
                  label="PuntPoints"
                  badge="NEW"
                  badgeColor="bg-primary/15 text-primary"
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Referral Program" }}
                  icon={UserPlus}
                  label="Referral Program"
                  right={
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      Earn & Grow <ChevronRight className="size-3.5" />
                    </span>
                  }
                />
                <NavLink
                  to="/community"
                  icon={Users}
                  label="Community"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Content & support */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Podcast" }}
                  icon={Mic}
                  label="Podcast"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <a
                  href="tel:0800006008"
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Shield className="size-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">Responsible Betting</span>
                  <span className="text-sm font-semibold text-primary">0800 006 008</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              </div>

              {/* Plans & store */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/pricing"
                  icon={Crown}
                  label="Pricing"
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Help links */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink to="/support" icon={HelpCircle} label="Help Center" />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "Feedback" }}
                  icon={MessageCircle}
                  label="Feedback"
                />
              </div>

              {/* Social */}
              <div className="mt-2 border-t border-border pt-3">
                <div className="flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-foreground">
                  <Share2 className="size-5 text-muted-foreground" />
                  <span className="flex-1">Follow Puntr</span>
                </div>
                <div className="mt-1 flex items-center gap-2 px-3 pb-2">
                  {[
                    { href: "https://x.com/punthub.za", label: "X" },
                    { href: "https://facebook.com/punthub.za", label: "f" },
                    { href: "https://instagram.com/punthub.za", label: "ig" },
                    { href: "https://youtube.com/@punthub", label: "yt" },
                    { href: "https://tiktok.com/@punthub.za", label: "tt" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-9 place-items-center rounded-full border border-border text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      aria-label={s.label}
                    >
                      {s.label === "X" ? "𝕏" : s.label === "f" ? "f" : s.label === "ig" ? "◎" : s.label === "yt" ? "▶" : "♪"}
                    </a>
                  ))}
                </div>
              </div>

              {/* Press + logout */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (isGuest) exitGuest();
                    else openEarlyAccess("Sign in or create an account to continue.");
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <LogOut className="size-5 shrink-0 text-muted-foreground" />
                  <span>Log out</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {bottomNavItems.map(({ label, to, icon: Icon }) => {
            const active = path === to;
            return (
              <li key={label}>
                <Link
                  to={to}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
          <li key="more">
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isMenuOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Menu className="size-5" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

export function openMobileMenu() {
  setMenuOpenExternal?.(true);
}
