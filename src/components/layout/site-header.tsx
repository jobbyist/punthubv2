import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
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
import { FoundingCounter } from "@/components/founding-counter";
import { copyInviteLink } from "@/lib/invite";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { inviteText, whatsappUrl } from "@/lib/referral";

export const primaryNav = [
  { key: "predictions", to: "/predictions" },
  { key: "leaderboards", to: "/leaderboards" },
  { key: "results", to: "/results" },
  { key: "community", to: "/community" },
  { key: "howItWorks", to: "/how-it-works", guestOnly: true },
  { key: "pricing", to: "/pricing" },
] as const;

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { isSignedIn, profile, signOut } = useSession();
  const pp = usePoints();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Signed-in (guest session) users don't need the marketing pages in the nav.
  const links = primaryNav.filter((l) => !("guestOnly" in l && l.guestOnly && isSignedIn));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:h-[70px]">
        <div className="flex min-w-0 items-center gap-2">
          {/* No hamburger: members use the bottom bar's "More" drawer; guests get Sign in and Join free. */}
          <Logo />
        </div>

        <nav className="hidden items-center justify-center gap-1 lg:flex">
          {links.map((l) => {
            const active = path === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative whitespace-nowrap px-2 py-2 text-sm font-medium transition-colors xl:px-3 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`primary.${l.key}`)}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary lg:-bottom-[13px]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-2">
          {/* The language switcher lives in the footer and the mobile menu: the desktop bar has no room for it
              next to eight links. Only en-ZA is enabled until P13; revisit placement then (e.g. a globe icon). */}
          {isSignedIn && profile && <NotificationBell />}
          {isSignedIn && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm font-medium">
                  <UserAvatar username={profile.username} url={profile.avatar_url} />
                  <span className="hidden max-w-[10rem] truncate sm:inline">
                    {profile.username}
                  </span>
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
                  onSelect={() =>
                    navigate({ to: "/u/$username", params: { username: profile.username } })
                  }
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
                        window.open(
                          whatsappUrl(inviteText(profile.referral_code!)),
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      {t("header.shareInvite")}
                    </DropdownMenuItem>
                  </>
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
                <DropdownMenuItem onSelect={() => navigate({ to: "/account" })}>
                  {t("header.account")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/account/privacy" })}>
                  {t("header.privacy")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  {t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <FoundingCounter className="hidden xl:inline-block" />
              <Link
                to="/join"
                className="whitespace-nowrap px-2 text-sm font-medium text-foreground hover:text-primary"
              >
                {t("header.signIn")}
              </Link>
              <Button asChild className="h-10 whitespace-nowrap px-4 text-sm sm:px-5">
                <Link to="/join">{t("header.getEarlyAccess")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
