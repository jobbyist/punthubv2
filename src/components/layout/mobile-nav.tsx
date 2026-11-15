import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bug,
  CalendarDays,
  Coins,
  Layers,
  Star,
  Swords,
  Trophy,
  Users,
  X,
  Home,
  TrendingUp,
  HelpCircle,
  Info,
  Building2,
  Radio,
  UserPlus,
  Shield,
  Crown,
  MessageCircle,
  MessageSquare,
  Share2,
  LogOut,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Map,
  Wrench,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { LiveBadge } from "@/components/live-badge";
import { useSession } from "@/components/session";
import { HELPLINE_DISPLAY, HELPLINE_TEL } from "@/components/rg-notice";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SocialLinks } from "@/components/social-links";

let setMenuOpenExternal: ((open: boolean) => void) | null = null;

type FlyoutGroupKey = "predictions" | "community" | "platform";

type FlyoutItem = {
  key: string;
  to:
    | "/fixtures"
    | "/results"
    | "/insights"
    | "/leaderboards"
    | "/forum"
    | "/duels"
    | "/newsroom"
    | "/tools"
    | "/bookmakers"
    | "/puntpoints"
    | "/pricing"
    | "/roadmap"
    | "/feedback";
  icon: ComponentType<{ className?: string }>;
};

/** Sub-menus of the three grouped tabs. `match` lists the path prefixes that light up the parent tab. */
const flyoutGroups: Record<
  FlyoutGroupKey,
  { icon: ComponentType<{ className?: string }>; items: FlyoutItem[]; match: string[] }
> = {
  predictions: {
    icon: TrendingUp,
    items: [
      { key: "fixtures", to: "/fixtures", icon: CalendarDays },
      { key: "results", to: "/results", icon: CheckCircle2 },
      { key: "insights", to: "/insights", icon: BarChart3 },
    ],
    match: ["/predictions", "/fixtures", "/results", "/insights", "/match"],
  },
  community: {
    icon: Users,
    items: [
      { key: "leaderboards", to: "/leaderboards", icon: Trophy },
      { key: "discussions", to: "/forum", icon: MessageSquare },
      { key: "duels", to: "/duels", icon: Swords },
      { key: "newsroom", to: "/newsroom", icon: Radio },
    ],
    match: ["/leaderboards", "/leaderboard", "/forum", "/duels", "/newsroom", "/u"],
  },
  platform: {
    icon: Layers,
    items: [
      { key: "tools", to: "/tools", icon: Wrench },
      { key: "bookmakers", to: "/bookmakers", icon: Building2 },
      { key: "puntpoints", to: "/puntpoints", icon: Star },
      { key: "credits", to: "/pricing", icon: Coins },
      { key: "roadmap", to: "/roadmap", icon: Map },
      { key: "feedback", to: "/feedback", icon: Bug },
    ],
    match: [
      "/tools",
      "/bookmakers",
      "/puntpoints",
      "/rewards",
      "/wallet",
      "/referrals",
      "/pricing",
      "/roadmap",
      "/feedback",
    ],
  },
};

const FLYOUT_KEYS = Object.keys(flyoutGroups) as FlyoutGroupKey[];

const pathMatches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Scroll tuning: ignore movement under the threshold so finger rests and micro-scrolls never flip the dock. */
const SCROLL_DELTA = 12;
const SCROLL_TOP_ZONE = 20;

/**
 * True while the dock should be tucked away. Hides after a sustained downward scroll, returns on the first sustained
 * upward scroll, and always shows near the top. `onScroll` fires for every accepted scroll tick (used to dismiss flyouts).
 */
function useDockHidden(onScroll: () => void) {
  const [hidden, setHidden] = useState(false);
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;

  useEffect(() => {
    let lastY = window.scrollY;
    let anchorY = lastY;
    let lastDir = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // Clamp so iOS rubber-banding above 0 or below the end is not read as a direction change.
      const y = Math.min(Math.max(window.scrollY, 0), maxY);

      if (y < SCROLL_TOP_ZONE) {
        setHidden(false);
        anchorY = y;
        lastY = y;
        lastDir = 0;
        return;
      }
      if (y === lastY) return;
      // Re-anchor whenever direction flips so the threshold measures a sustained run in one direction.
      const dir = Math.sign(y - lastY);
      if (dir !== lastDir) {
        anchorY = lastY;
        lastDir = dir;
      }
      lastY = y;
      const delta = y - anchorY;
      if (Math.abs(delta) < SCROLL_DELTA) return;
      onScrollRef.current();
      setHidden(delta > 0);
      anchorY = y;
    };

    const onScrollEvent = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScrollEvent, { passive: true });
    return () => window.removeEventListener("scroll", onScrollEvent);
  }, []);

  return hidden;
}

const sports = [
  { key: "soccer", emoji: "⚽", active: true },
  { key: "rugby", emoji: "🏉", active: false },
  { key: "basketball", emoji: "🏀", active: false },
  { key: "tennis", emoji: "🎾", active: false },
  { key: "cricket", emoji: "🏏", active: false },
  { key: "combat", emoji: "🥊", active: false },
  { key: "athletics", emoji: "🏃", active: false },
  { key: "racing", emoji: "🏇", active: false },
] as const;

function NavLink({
  path,
  onNavigate,
  to,
  search,
  icon: Icon,
  label,
  badge,
  badgeColor = "bg-primary-soft text-primary",
  right,
  active: forceActive,
}: {
  path: string;
  onNavigate: () => void;
  to?: string;
  search?: Record<string, string>;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  badgeColor?: string;
  right?: ReactNode;
  active?: boolean;
}) {
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
      <Link to={to} {...(search ? { search } : {})} onClick={onNavigate}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onNavigate} className="w-full text-left">
      {content}
    </button>
  );
}

export function MobileNav() {
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const { isSignedIn, loading: sessionLoading, signOut } = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(true);
  // `flyout` is the group whose sheet is open; `lastFlyout` keeps its content mounted while the sheet animates out.
  const [flyout, setFlyout] = useState<FlyoutGroupKey | null>(null);
  const [lastFlyout, setLastFlyout] = useState<FlyoutGroupKey>("predictions");
  const triggerRefs = useRef<Partial<Record<FlyoutGroupKey, HTMLButtonElement | null>>>({});
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMenuOpenExternal = setIsMenuOpen;
    return () => {
      setMenuOpenExternal = null;
    };
  }, []);

  const close = () => setIsMenuOpen(false);

  const flyoutRef = useRef<FlyoutGroupKey | null>(null);
  flyoutRef.current = flyout;

  const closeFlyout = useCallback((restoreFocus = false) => {
    const current = flyoutRef.current;
    if (current && restoreFocus) triggerRefs.current[current]?.focus();
    setFlyout(null);
  }, []);

  const dockHidden = useDockHidden(() => closeFlyout());

  // Close any flyout on navigation, and on Escape.
  useEffect(() => {
    closeFlyout();
  }, [path, closeFlyout]);
  useEffect(() => {
    if (!flyout) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeFlyout(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyout, closeFlyout]);

  // Move focus into the sheet when it opens so keyboard and screen-reader users land on the first option.
  useEffect(() => {
    if (!flyout) return;
    sheetRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [flyout]);

  const toggleFlyout = (key: FlyoutGroupKey) => {
    if (flyout === key) {
      closeFlyout(true);
      return;
    }
    setLastFlyout(key);
    setFlyout(key);
  };

  const onSheetKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[index === -1 ? 0 : (index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[index === -1 ? items.length - 1 : (index - 1 + items.length) % items.length]?.focus();
    }
  };

  const guestStripVisible =
    !sessionLoading &&
    !isSignedIn &&
    !path.startsWith("/admin") &&
    path !== "/join" &&
    path !== "/founding";
  // Guests on the sign-up and admin screens get no dock, so nothing competes with the form.
  const dockVisible = isSignedIn || (path !== "/join" && !path.startsWith("/admin"));
  const hideDock = dockHidden && !flyout;
  const activeGroup = FLYOUT_KEYS.find((k) => pathMatches(path, flyoutGroups[k].match)) ?? null;
  const sheetGroup = flyoutGroups[lastFlyout];

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
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/"
                  icon={Home}
                  label={t("mobile.home")}
                  active={path === "/"}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/about"
                  icon={Info}
                  label={t("primary.about")}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/newsroom"
                  icon={Radio}
                  label={t("primary.updates")}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/coming-soon"
                  icon={BarChart3}
                  label={t("primary.insights")}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/tools"
                  icon={Wrench}
                  label={t("primary.tools")}
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
                          to="/sports/$sport"
                          params={{ sport: s.key }}
                          onClick={close}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-1 py-3 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft"
                        >
                          <span className="text-xl leading-none">{s.emoji}</span>
                          <span className="text-[11px] font-medium text-foreground">
                            {t(`sport.${s.key}`)}
                          </span>
                          {s.key === "soccer" && <LiveBadge />}
                        </Link>
                      ) : (
                        <Link
                          key={s.key}
                          to="/sports/$sport"
                          params={{ sport: s.key }}
                          onClick={close}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-1 py-3 text-center opacity-80 transition-colors hover:opacity-100"
                        >
                          <span className="text-xl leading-none grayscale">{s.emoji}</span>
                          <span className="text-[11px] font-medium text-foreground">
                            {t(`sport.${s.key}`)}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {tc("badge.comingSoon")}
                          </span>
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Tools & services */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/bookmakers"
                  icon={Building2}
                  label={t("mobile.tools.bookmakers")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />

                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/live-scores"
                  icon={Radio}
                  label={t("mobile.tools.liveScores")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Rewards & community */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/puntpoints"
                  icon={Star}
                  label={t("mobile.tools.puntPoints")}
                  badge={tc("badge.new")}
                  badgeColor="bg-primary/15 text-primary"
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/referrals"
                  icon={UserPlus}
                  label={t("mobile.tools.referrals")}
                  right={
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      {t("mobile.invite")} <ChevronRight className="size-3.5" />
                    </span>
                  }
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/forum"
                  icon={Users}
                  label={t("primary.community")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Content & support */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
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
                  path={path}
                  onNavigate={close}
                  to="/pricing"
                  icon={Crown}
                  label={t("primary.pricing")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/roadmap"
                  icon={Map}
                  label={t("mobile.roadmap")}
                  right={<ChevronRight className="size-4 text-muted-foreground" />}
                />
              </div>

              {/* Help links */}
              <div className="mt-2 space-y-0.5 border-t border-border pt-3">
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/support"
                  icon={HelpCircle}
                  label={t("mobile.helpCentre")}
                />
                <NavLink
                  path={path}
                  onNavigate={close}
                  to="/feedback"
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
                <SocialLinks
                  className="px-3 pb-2"
                  iconClassName="size-4"
                  itemClassName="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                />
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

      {/* Backdrop behind an open flyout: dims and blurs the page, and a tap anywhere on it dismisses the sheet. */}
      {dockVisible && (
        <div
          aria-hidden="true"
          onClick={() => closeFlyout(true)}
          className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-[opacity,visibility] duration-200 motion-reduce:transition-none lg:hidden ${
            flyout ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
          }`}
        />
      )}

      {/*
        Floating dock. Slides off-screen on a sustained scroll down and returns on scroll up (see useDockHidden).
        Guests get the same dock with a compact Founding Member conversion row on top, so the offer stays in view
        without taking over navigation. The flyout sheet is anchored to the top of this container, so it always
        sits directly above the thumb zone, whatever sits in the dock.
      */}
      {dockVisible && (
        <div
          inert={hideDock}
          className={`fixed inset-x-3 z-40 transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none lg:hidden ${
            hideDock ? "translate-y-[150%]" : "translate-y-0"
          }`}
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {/* Flyout bottom sheet */}
          <div
            ref={sheetRef}
            id="mobile-dock-flyout"
            role="menu"
            aria-label={t(`mobile.dock.${lastFlyout}`)}
            onKeyDown={onSheetKeyDown}
            className={`absolute inset-x-0 bottom-full mb-2 origin-bottom overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/15 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
              flyout
                ? "visible translate-y-0 scale-100 opacity-100"
                : "invisible pointer-events-none translate-y-3 scale-[0.98] opacity-0"
            }`}
          >
            <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {t(`mobile.dock.${lastFlyout}`)}
            </p>
            <ul className="max-h-[60vh] overflow-y-auto overscroll-contain px-2 pb-2">
              {sheetGroup.items.map(({ key, to, icon: Icon }) => {
                const active = path === to || path.startsWith(`${to}/`);
                return (
                  <li key={key} role="none">
                    <Link
                      to={to}
                      role="menuitem"
                      tabIndex={flyout ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      onClick={() => closeFlyout()}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-3 text-[15px] font-medium transition-colors focus-visible:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-foreground hover:bg-muted active:bg-muted"
                      }`}
                    >
                      <Icon
                        className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="flex-1 truncate">{t(`mobile.dock.flyout.${key}`)}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background/95 shadow-lg shadow-black/10 backdrop-blur-xl">
            {guestStripVisible && (
              <div className="flex items-center gap-3 border-b border-border bg-primary-soft px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold leading-tight text-foreground">
                    {t("mobile.dock.foundingTitle")}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                    {t("mobile.dock.foundingMessage")}
                  </p>
                </div>
                <Link
                  to="/join"
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
                >
                  {t("mobile.dock.claimSpot")}
                </Link>
              </div>
            )}
            <nav aria-label={t("mobile.primary")}>
              <ul className="grid grid-cols-4">
                <li>
                  <Link
                    to="/"
                    aria-current={path === "/" ? "page" : undefined}
                    onClick={() => closeFlyout()}
                    className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                      path === "/" && !flyout ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Home className="size-[19px]" />
                    <span>{t("mobile.home")}</span>
                    <DockPill on={path === "/" && !flyout} />
                  </Link>
                </li>
                {FLYOUT_KEYS.map((key) => {
                  const Icon = flyoutGroups[key].icon;
                  const open = flyout === key;
                  const on = open || (!flyout && activeGroup === key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        ref={(el) => {
                          triggerRefs.current[key] = el;
                        }}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-controls="mobile-dock-flyout"
                        aria-current={!flyout && activeGroup === key ? "page" : undefined}
                        onClick={() => toggleFlyout(key)}
                        className={`relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                          on ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-[19px]" />
                        <span>{t(`mobile.dock.${key}`)}</span>
                        <DockPill on={on} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function DockPill({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute bottom-1 h-1 w-5 rounded-full transition-all ${
        on ? "bg-primary opacity-100" : "bg-transparent opacity-0"
      }`}
    />
  );
}

export function openMobileMenu() {
  setMenuOpenExternal?.(true);
}
