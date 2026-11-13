import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Compass,
  Newspaper,
  Route,
  Swords,
  Trophy,
  Wrench,
  ClipboardCheck,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { UserAvatar } from "@/components/user-avatar";
import { usePoints } from "@/hooks/use-points";
import { points as formatPoints } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { FoundingCounter } from "@/components/founding-counter";
import { copyInviteLink } from "@/lib/invite";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { inviteText, whatsappUrl } from "@/lib/referral";

const navigationGroups = [
  {
    key: "intelligence",
    icon: Sparkles,
    items: [
      { key: "fixtures", to: "/predictions", icon: CalendarDays },
      { key: "matchupTools", to: "/tools", icon: Wrench },
      { key: "gradedPicks", to: "/results", icon: ClipboardCheck },
    ],
  },
  {
    key: "community",
    icon: Trophy,
    items: [
      { key: "leaderboards", to: "/leaderboards", icon: Trophy },
      // H2H currently lives in the existing competitive leaderboard experience.
      { key: "headToHead", to: "/leaderboards", icon: Swords },
      { key: "tipsterRankings", to: "/leaderboards", icon: Compass },
    ],
  },
  {
    key: "platform",
    icon: Newspaper,
    items: [
      { key: "howItWorks", to: "/how-it-works", guestOnly: true, icon: Route },
      { key: "pricing", to: "/pricing", icon: ClipboardCheck },
      { key: "newsroom", to: "/newsroom", icon: Newspaper },
      { key: "roadmap", to: "/roadmap", icon: Route },
    ],
  },
] as const;

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { isSignedIn, profile, signOut } = useSession();
  const pp = usePoints();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <div className="flex min-w-0 shrink-0 items-center">
          <Logo />
        </div>

        <nav aria-label={t("header.desktopNavigation")} className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !("guestOnly" in item && item.guestOnly && isSignedIn),
            );
            if (visibleItems.length === 0) return null;
            const GroupIcon = group.icon;
            const active = visibleItems.some((item) => path === item.to || path.startsWith(item.to + "/"));
            return (
              <DropdownMenu key={group.key}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[state=open]:bg-muted ${active ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    aria-label={t(`desktop.groups.${group.key}`)}
                  >
                    <GroupIcon className="size-4" />
                    {t(`desktop.groups.${group.key}`)}
                    <ChevronDown className="size-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={10} className="w-64 rounded-xl p-2 shadow-xl">
                  <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {t(`desktop.groups.${group.key}`)}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive = path === item.to || path.startsWith(item.to + "/");
                    return (
                      <DropdownMenuItem key={item.key} asChild className="cursor-pointer rounded-lg px-3 py-2.5">
                        <Link to={item.to} className={itemActive ? "text-primary" : ""}>
                          <ItemIcon className="size-4 text-muted-foreground" />
                          <span className="flex-1">{t(`desktop.items.${item.key}`)}</span>
                          {itemActive && <span className="size-1.5 rounded-full bg-primary" />}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
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
                <DropdownMenuItem onSelect={() => navigate({ to: "/u/$username", params: { username: profile.username } })}>
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
                <Link to="/join">{t("header.getEarlyAccess")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
