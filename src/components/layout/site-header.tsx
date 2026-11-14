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
  Radio,
  Swords,
  Target,
  Trophy,
  Users,
  Wrench,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
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

function isActive(path: string, to: string) {
  return path === to || (to !== "/" && path.startsWith(to + "/"));
}

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { isSignedIn, profile, signOut } = useSession();
  const pp = usePoints();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: liveFixtures } = useAsync(() => fetchLiveFixtures(1), []);

  const directLinks = [
    { key: "home", to: "/", icon: House },
    { key: "fixtures", to: "/predictions", icon: CalendarDays },
    { key: "community", to: "/community", icon: Users },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <div className="flex min-w-0 shrink-0 items-center">
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
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${["/results", "/leaderboards", "/tools", "/live-scores"].some((to) => isActive(path, to)) ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <ClipboardCheck className="size-4" />
                {t("desktop.groups.browse")}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={10} className="w-64 rounded-xl p-2 shadow-xl">
              <DropdownMenuLabel>{t("desktop.groups.browse")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: "gradedResults", to: "/results", icon: ClipboardCheck },
                { key: "leaderboards", to: "/leaderboards", icon: Trophy },
                { key: "bettingTools", to: "/tools", icon: Wrench },
                { key: "liveScores", to: "/live-scores", icon: Radio },
              ].map(({ key, to, icon: Icon }) => (
                <DropdownMenuItem key={key} asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                  <Link to={to} className={isActive(path, to) ? "text-primary" : ""}>
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{t(`desktop.items.${key}`)}</span>
                    {isActive(path, to) && <span className="size-1.5 rounded-full bg-primary" />}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${["/sports", "/predictions", "/roadmap", "/leaderboards"].some((to) => isActive(path, to)) ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Trophy className="size-4" />
                {t("desktop.groups.discover")}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={10} className="w-72 rounded-xl p-2 shadow-xl">
              <DropdownMenuLabel>{t("desktop.groups.discover")}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg px-3 py-2.5">
                  <Trophy className="size-4 text-muted-foreground" />
                  {t("desktop.items.featuredSports")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-xl p-2">
                  {featuredSports.map(({ key, labelKey, icon: Icon }) => (
                    <DropdownMenuItem key={key} asChild className="cursor-pointer rounded-lg px-3 py-2">
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
                    <DropdownMenuItem key={competition.key} asChild className="cursor-pointer rounded-lg px-3 py-2">
                      <Link to="/predictions" search={{ competition: competition.name }}>
                        <span className="flex-1">{competition.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                <Link to="/leaderboards" className={isActive(path, "/leaderboards") ? "text-primary" : ""}>
                  <Swords className="size-4 text-muted-foreground" />
                  <span className="flex-1">{t("desktop.items.headToHead")}</span>
                  {isActive(path, "/leaderboards") && <span className="size-1.5 rounded-full bg-primary" />}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="rounded-lg px-3 py-2.5">
                <Target className="size-4 text-muted-foreground" />
                <span className="flex-1">{t("desktop.items.fantasyLeague")}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("desktop.comingSoon")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                <Link to="/roadmap" className={isActive(path, "/roadmap") ? "text-primary" : ""}>
                  <Map className="size-4 text-muted-foreground" />
                  <span className="flex-1">{t("desktop.items.roadmap")}</span>
                  {isActive(path, "/roadmap") && <span className="size-1.5 rounded-full bg-primary" />}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${["/bookmakers", "/puntpoints", "/about", "/support"].some((to) => isActive(path, to)) ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Building2 className="size-4" />
                {t("desktop.groups.platform")}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={10} className="w-64 rounded-xl p-2 shadow-xl">
              <DropdownMenuLabel>{t("desktop.groups.platform")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: "bookmakers", to: "/bookmakers", icon: Building2 },
                { key: "puntPoints", to: "/puntpoints", icon: Coins },
                { key: "about", to: "/about", icon: Info },
                { key: "support", to: "/support", icon: LifeBuoy },
              ].map(({ key, to, icon: Icon }) => (
                <DropdownMenuItem key={key} asChild className="cursor-pointer rounded-lg px-3 py-2.5">
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

        <div className="flex shrink-0 items-center justify-end gap-2">
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
                  <span className="hidden max-w-[10rem] truncate sm:inline">{profile.username}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{profile.username}</span>
                  {profile.founding_number && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {t("header.founding", { number: profile.founding_number })}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/u/$username", params: { username: profile.username } })}
                >
                  {t("header.myRecord")}
                </DropdownMenuItem>
                {profile.referral_code && (
                  <>
                    <DropdownMenuItem
                      onSelect={async () => {
                        const code = profile.referral_code!;
                        if (await copyInviteLink(code)) toast.success(t("header.invite"));
                      }}
                    >
                      {t("header.copyInvite")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        analytics.shareClicked("invite");
                        window.open(whatsappUrl(inviteText(profile.referral_code!)), "_blank", "noopener,noreferrer");
                      }}
                    >
                      {t("header.shareInvite")}
                    </DropdownMenuItem>
                  </>
                )}
                {profile.founding_number && (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/practice" })}>
                    {t("header.practice")}
                  </DropdownMenuItem>
                )}
                {pp.enabled && (
                  <DropdownMenuItem onSelect={() => navigate({ to: "/rewards" })}>
                    {t("header.puntPoints")}
                    {pp.balance !== null && (
                      <span className="ml-auto pl-3 text-xs font-semibold text-primary tnum">
                        {formatPoints(pp.balance)}
                      </span>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => navigate({ to: "/wallet" })}>{t("header.wallet")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/account" })}>{t("header.account")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/account/privacy" })}>{t("header.privacy")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>{t("header.signOut")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <FoundingCounter compact className="hidden xl:inline-flex" />
              <Link
                to="/join"
                className="hidden whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                {t("header.signIn")}
              </Link>
              <Button asChild className="h-10 whitespace-nowrap px-3 text-xs font-bold shadow-sm sm:px-4 sm:text-sm">
                <Link to="/join">{t("header.claimFoundingAccess")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
