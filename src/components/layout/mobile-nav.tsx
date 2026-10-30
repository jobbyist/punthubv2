import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Map,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { useSession } from "@/components/session";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/rg-notice";
import { LanguageSwitcher } from "@/components/language-switcher";

let setMenuOpenExternal: ((open: boolean) => void) | null = null;

const bottomNavItems = [
  { key: "predictions", to: "/predictions", icon: Target },
  { key: "results", to: "/results", icon: BarChart3 },
  { key: "community", to: "/community", icon: Users },
  { key: "leaderboards", to: "/leaderboards", icon: Trophy },
] as const;

const sports = [
  { key: "soccer", emoji: "⚽", to: "/predictions", active: true },
  { key: "rugby", emoji: "🏉", active: false },
  { key: "basketball", emoji: "🏀", active: false },
  { key: "tennis", emoji: "🎾", active: false },
  { key: "cricket", emoji: "🏏", active: false },
  { key: "combat", emoji: "🥊", active: false },
  { key: "racing", emoji: "🏇", active: false },
] as const;

export function MobileNav() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const { isSignedIn, signOut } = useSession();
  const navigate = useNavigate();
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
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeColor}`}
          >
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
              aria-label={t("mobile.closeMenu")}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Scrollable menu content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <nav className="px-3 py-3">
              {/* Primary links */}
              <div className="space-y-0.5">
                <NavLink to="/" icon={Home} label={t("mobile.home")} active={path === "/"} />
                <NavLink to="/predictions" icon={Target} label={t("primary.predictions")} />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "aiPicks" }}
                  icon={Brain}
                  label={t("mobile.tools.aiPicks")}
                  badge={tc("badge.pro")}
                  badgeColor="bg-primary/15 text-primary"
                />
                <NavLink
                  to="/insights"
                  icon={TrendingUp}
                  label={t("mobile.tools.marketInsights")}
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "podcast" }}
                  icon={Mic}
                  label={t("mobile.tools.podcast")}
                />
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
                    {t("mobile.sports")}
                  </span>
                  {sportsOpen ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </button>

                {sportsOpen && (
                  <div className="mt-2 grid grid-cols-4 gap-2 px-1 pb-2">
                    {sports.map((s) =>
                      s.active ? (
                        <Link
                          key={s.key}
                          to={s.to}
                          onClick={close}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-1 py-3 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft"
                        >
                          <span className="text-xl leading-none">{s.emoji}</span>
                          <span className="text-[11px] font-medium text-foreground">
                            {t(`sport.${s.key}`)}
                          </span>
                        </Link>
                      ) : (
                        <div
                          key={s.key}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-1 py-3 text-center opacity-70"
                        >
                          <span className="text-xl leading-none grayscale">{s.emoji}</span>
                          <span className="text-[11px] font-medium text-foreground">
                            {t(`sport.${s.key}`)}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {tc("badge.comingSoon")}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Tools & services */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "bookmakers" }}
                  icon={Building2}
                  label={t("mobile.tools.bookmakers")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "tools" }}
                  icon={Wrench}
                  label={t("mobile.tools.tools")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "liveScores" }}
                  icon={Radio}
                  label={t("mobile.tools.liveScores")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Rewards & community */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "puntPoints" }}
                  icon={Star}
                  label={t("mobile.tools.puntPoints")}
                  badge={tc("badge.new")}
                  badgeColor="bg-primary/15 text-primary"
                />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "referrals" }}
                  icon={UserPlus}
                  label={t("mobile.tools.referrals")}
                  right={
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      {t("mobile.invite")} <ChevronRight className="size-3.5" />
                    </span>
                  }
                />
                <NavLink
                  to="/community"
                  icon={Users}
                  label={t("primary.community")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Content & support */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "podcast" }}
                  icon={Mic}
                  label={t("mobile.tools.podcast")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <a
                  href={HELPLINE_TEL}
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Shield className="size-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{t("mobile.responsibleGambling")}</span>
                  <span className="text-sm font-semibold text-primary tnum">
                    {HELPLINE_DISPLAY}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              </div>

              {/* Plans & store */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  to="/pricing"
                  icon={Crown}
                  label={t("primary.pricing")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  to="/roadmap"
                  icon={Map}
                  label={t("mobile.roadmap")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Help links */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink to="/support" icon={HelpCircle} label={t("mobile.helpCentre")} />
                <NavLink
                  to="/coming-soon"
                  search={{ feature: "feedback" }}
                  icon={MessageCircle}
                  label={t("mobile.feedback")}
                />
              </div>

              {/* Social */}
              <div className="mt-2 border-t border-border pt-3">
                <div className="flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-foreground">
                  <Share2 className="size-5 text-muted-foreground" />
                  <span className="flex-1">{t("mobile.followPuntr")}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 px-3 pb-2">
                  {[
                    { href: "https://x.com/puntr_za", label: "X" },
                    { href: "https://facebook.com/puntrza", label: "f" },
                    { href: "https://instagram.com/puntr_za", label: "ig" },
                    { href: "https://youtube.com/@puntr_za", label: "yt" },
                    { href: "https://tiktok.com/@puntr_za", label: "tt" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid size-9 place-items-center rounded-full border border-border text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      aria-label={s.label}
                    >
                      {s.label === "X"
                        ? "𝕏"
                        : s.label === "f"
                          ? "f"
                          : s.label === "ig"
                            ? "◎"
                            : s.label === "yt"
                              ? "▶"
                              : "♪"}
                    </a>
                  ))}
                </div>
              </div>

              {/* Press + logout */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (isSignedIn) void signOut();
                    else navigate({ to: "/join" });
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <LogOut className="size-5 shrink-0 text-muted-foreground" />
                  <span>{isSignedIn ? t("mobile.logOut") : t("mobile.signIn")}</span>
                </button>
                <LanguageSwitcher className="px-3 py-2" />
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        aria-label={t("mobile.primary")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {bottomNavItems.map(({ key, to, icon: Icon }) => {
            const active = path === to;
            return (
              <li key={key}>
                <Link
                  to={to}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="max-w-full truncate px-0.5">{t(`primary.${key}`)}</span>
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
              <span className="max-w-full truncate px-0.5">{t("mobile.more")}</span>
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
