import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Flag,
  Goal,
  House,
  Info,
  LifeBuoy,
  Map,
  Menu,
  Radio,
  Swords,
  Target,
  Trophy,
  Users,
  Wrench,
  Building2,
  BarChart3,
  Gift,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  Share2,
  ShieldCheck,
  Ticket,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { openMobileMenu } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { UserAvatar } from "@/components/user-avatar";
import { usePoints } from "@/hooks/use-points";
import { useAsync } from "@/hooks/use-async";
import { points as formatPoints } from "@/lib/format";
import { fetchLiveFixtures } from "@/lib/fixtures";
import { competitions } from "@/lib/sports/competitions";
import type { RoadmapSport } from "@/lib/roadmap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { FoundingCounter } from "@/components/founding-counter";
import { copyInviteLink } from "@/lib/invite";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { inviteText, whatsappUrl } from "@/lib/referral";

const featuredSports: { key: RoadmapSport; labelKey: string; icon: LucideIcon }[] = [
  { key: "soccer", labelKey: "soccer", icon: Goal },
  { key: "basketball", labelKey: "basketball", icon: Activity },
  { key: "rugby", labelKey: "rugby", icon: Flag },
  { key: "racing", labelKey: "racing", icon: Trophy },
  { key: "tennis", labelKey: "tennis", icon: Target },
  { key: "cricket", labelKey: "cricket", icon: Activity },
  { key: "combat", labelKey: "combat", icon: Swords },
];

/** One account-menu row: icon, label, consistent spacing. */
function MenuItem({
  icon: Icon,
  label,
  onSelect,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={`gap-2.5 px-2 py-2 ${className}`}>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{label}</span>
    </DropdownMenuItem>
  );
}

function isActive(path: string, to: string) {
  return path === to || (to !== "/" && path.startsWith(to + "/"));
}

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { isSignedIn, profile, signOut, isAdmin } = useSession();
  const pp = usePoints();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: liveFixtures } = useAsync(() => fetchLiveFixtures(1), []);

  const directLinks = [
    { key: "home", to: "/", icon: House },
    { key: "fixtures", to: "/predictions", icon: CalendarDays },
    { key: "community", to: "/forum", icon: Users },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:h-[72px]">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {/* Phones and tablets: the full menu opens from here now that the dock has no More tab. */}
          <button
            type="button"
            onClick={openMobileMenu}
            aria-label={t("header.openMenu")}
            aria-haspopup="dialog"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
        </div>

        <nav
          aria-label={t("header.desktopNavigation")}
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
        >
          {directLinks.map(({ key, to, icon: Icon }) => {
            const active = isActive(path, to);
            return (
              <Link
                key={key}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-muted hover:text-foreground ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="size-4" />
                {t(`desktop.direct.${key}`)}
                {key === "fixtures" && (liveFixtures?.length ?? 0) > 0 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgb(16_185_129/45%)] motion-safe:animate-pulse"
                    />
                    <span className="sr-only">{t("desktop.liveMatches")}</span>
                  </>
                )}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${["/results", "/leaderboards", "/tools", "/live-scores", "/sports", "/predictions", "/roadmap"].some((to) => isActive(path, to)) ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Wrench className="size-4" />
                {t("desktop.groups.platform")}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={10}
              className="w-72 rounded-xl p-2 shadow-xl"
            >
              <DropdownMenuLabel>{t("desktop.groups.platform")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  { key: "gradedResults", to: "/results", icon: ClipboardCheck },
                  { key: "leaderboards", to: "/leaderboards", icon: Trophy },
                  { key: "bettingTools", to: "/tools", icon: Wrench },
                  { key: "liveScores", to: "/live-scores", icon: Radio },
                  { key: "roadmap", to: "/roadmap", icon: Map },
                ] as const
              ).map(({ key, to, icon: Icon }) => (
                <DropdownMenuItem
                  key={key}
                  asChild
                  className="cursor-pointer rounded-lg px-3 py-2.5"
                >
                  <Link to={to} className={isActive(path, to) ? "text-primary" : ""}>
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{t(`desktop.items.${key}`)}</span>
                    {isActive(path, to) && <span className="size-1.5 rounded-full bg-primary" />}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg px-3 py-2.5">
                  <Trophy className="size-4 text-muted-foreground" />
                  {t("desktop.items.featuredSports")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-xl p-2">
                  {featuredSports.map(({ key, labelKey, icon: Icon }) => (
                    <DropdownMenuItem
                      key={key}
                      asChild
                      className="cursor-pointer rounded-lg px-3 py-2"
                    >
                      <Link to="/sports/$sport" params={{ sport: key }}>
                        <Icon className="size-4 text-muted-foreground" />
                        {t(`sport.${labelKey}`)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg px-3 py-2.5">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {t("desktop.items.competitions")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[70vh] w-64 overflow-y-auto rounded-xl p-2">
                  {competitions.map((competition) => (
                    <DropdownMenuItem
                      key={competition.key}
                      asChild
                      className="cursor-pointer rounded-lg px-3 py-2"
                    >
                      <Link to="/predictions" search={{ competition: competition.name }}>
                        <span className="flex-1">{competition.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem disabled className="rounded-lg px-3 py-2.5">
                <Target className="size-4 text-muted-foreground" />
                <span className="flex-1">{t("desktop.items.fantasyLeague")}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("desktop.comingSoon")}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${["/bookmakers", "/puntpoints", "/about", "/support"].some((to) => isActive(path, to)) ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {t("desktop.groups.more")}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={10}
              className="w-64 rounded-xl p-2 shadow-xl"
            >
              <DropdownMenuLabel>{t("desktop.groups.more")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  { key: "bookmakers", to: "/bookmakers", icon: Building2 },
                  { key: "puntPoints", to: "/puntpoints", icon: Coins },
                  { key: "about", to: "/about", icon: Info },
                  { key: "support", to: "/support", icon: LifeBuoy },
                ] as const
              ).map(({ key, to, icon: Icon }) => (
                <DropdownMenuItem
                  key={key}
                  asChild
                  className="cursor-pointer rounded-lg px-3 py-2.5"
                >
                  <Link to={to} className={isActive(path, to) ? "text-primary" : ""}>
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{t(`desktop.items.${key}`)}</span>
                    {isActive(path, to) && <span className="size-1.5 rounded-full bg-primary" />}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <ThemeToggle />
          {isSignedIn && profile && <NotificationBell />}
          {isSignedIn && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("header.accountMenu", { username: profile.username })}
                  className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <UserAvatar username={profile.username} url={profile.avatar_url} />
                  <span className="hidden max-w-[10rem] truncate sm:inline">
                    {profile.username}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5">
                <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
                  <UserAvatar username={profile.username} url={profile.avatar_url} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{profile.username}</span>
                    {profile.founding_number && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {t("header.founding", { number: profile.founding_number })}
                      </span>
                    )}
                  </span>
                </DropdownMenuLabel>
                {pp.enabled && (
                  <DropdownMenuItem
                    onSelect={() => navigate({ to: "/wallet" })}
                    className="mx-1 mb-1 justify-between rounded-md bg-primary-soft px-3 py-2 text-primary focus:bg-primary-soft"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {t("header.balance")}
                    </span>
                    <span className="text-sm font-bold tnum">
                      {pp.balance !== null ? formatPoints(pp.balance) : "-"}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("header.groups.activity")}
                </DropdownMenuLabel>
                <MenuItem
                  icon={BarChart3}
                  label={t("header.myRecord")}
                  onSelect={() =>
                    navigate({ to: "/u/$username", params: { username: profile.username } })
                  }
                />
                <MenuItem
                  icon={Ticket}
                  label={t("header.mySlips")}
                  onSelect={() => navigate({ to: "/slips" })}
                />
                <MenuItem
                  icon={Swords}
                  label={t("header.myDuels")}
                  onSelect={() => navigate({ to: "/duels" })}
                />
                {profile.founding_number && (
                  <MenuItem
                    icon={Target}
                    label={t("header.practice")}
                    onSelect={() => navigate({ to: "/practice" })}
                  />
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("header.groups.money")}
                </DropdownMenuLabel>
                <MenuItem
                  icon={Wallet}
                  label={t("header.wallet")}
                  onSelect={() => navigate({ to: "/wallet" })}
                />
                {pp.enabled && (
                  <MenuItem
                    icon={Gift}
                    label={t("header.puntPoints")}
                    onSelect={() => navigate({ to: "/rewards" })}
                  />
                )}
                {profile.referral_code && (
                  <>
                    <MenuItem
                      icon={Link2}
                      label={t("header.copyInvite")}
                      onSelect={async () => {
                        const code = profile.referral_code!;
                        if (await copyInviteLink(code)) toast.success(t("header.invite"));
                      }}
                    />
                    <MenuItem
                      icon={Share2}
                      label={t("header.shareInvite")}
                      onSelect={() => {
                        analytics.shareClicked("invite");
                        window.open(
                          whatsappUrl(inviteText(profile.referral_code!)),
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    />
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("header.groups.settings")}
                </DropdownMenuLabel>
                <MenuItem
                  icon={UserCog}
                  label={t("header.account")}
                  onSelect={() => navigate({ to: "/account" })}
                />
                <MenuItem
                  icon={ShieldCheck}
                  label={t("header.security")}
                  onSelect={() => navigate({ to: "/account/security" })}
                />
                <MenuItem
                  icon={Lock}
                  label={t("header.privacy")}
                  onSelect={() => navigate({ to: "/account/privacy" })}
                />
                {isAdmin && (
                  <MenuItem
                    icon={LayoutDashboard}
                    label={t("header.admin")}
                    onSelect={() => navigate({ to: "/admin" })}
                  />
                )}
                {isAdmin && (
                  <MenuItem
                    icon={ClipboardCheck}
                    label="Founding HQ"
                    onSelect={() => navigate({ to: "/admin/founding-hq" })}
                  />
                )}
                <DropdownMenuSeparator />
                <MenuItem
                  icon={LogOut}
                  label={t("header.signOut")}
                  onSelect={() => void signOut()}
                  className="text-destructive focus:text-destructive"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <div className="hidden xl:block">
                <FoundingCounter compact />
              </div>
              <Link
                to="/join"
                className="hidden whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                {t("header.signIn")}
              </Link>
              <Button
                asChild
                className="h-10 whitespace-nowrap px-3 text-xs font-bold shadow-sm sm:px-4 sm:text-sm"
              >
                <Link to="/join">{t("header.getEarlyAccess")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
