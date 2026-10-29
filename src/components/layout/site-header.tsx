import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/components/session";
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
import { openMobileMenu } from "@/components/layout/mobile-nav";
import { FoundingCounter } from "@/components/founding-counter";
import { LanguageSwitcher } from "@/components/language-switcher";
import { copyInviteLink } from "@/lib/invite";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { inviteText, whatsappUrl } from "@/lib/referral";

export const primaryNav = [
  { key: "predictions", to: "/predictions" },
  { key: "leaderboards", to: "/leaderboards" },
  { key: "results", to: "/results" },
  { key: "community", to: "/community" },
  { key: "insights", to: "/insights" },
  { key: "howItWorks", to: "/how-it-works", guestOnly: true },
  { key: "pricing", to: "/pricing", guestOnly: true },
  { key: "support", to: "/support" },
] as const;

export function SiteHeader() {
  const { t } = useTranslation("nav");
  const { isSignedIn, profile, signOut } = useSession();
  const pp = usePoints();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Signed-in (guest session) users don't need the marketing pages in the nav.
  const links = primaryNav.filter((l) => !("guestOnly" in l && l.guestOnly && isSignedIn));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:h-[70px]">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className={path === "/" ? "hidden" : ""}>
              <button
                className="grid size-9 shrink-0 place-items-center rounded-lg lg:hidden"
                aria-label={t("header.openMenu")}
              >
                <Menu
                  className="size-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMobileMenu();
                  }}
                />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">{t("header.menu")}</SheetTitle>
              <div className="border-b border-border px-5 py-4">
                <Logo />
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors hover:bg-muted data-[status=active]:bg-primary-soft data-[status=active]:text-primary"
                  >
                    <span className="size-1.5 rounded-full bg-muted-foreground opacity-0 transition-opacity group-hover:opacity-50 group-data-[status=active]:bg-primary group-data-[status=active]:opacity-100" />
                    {t(`primary.${l.key}`)}
                  </Link>
                ))}
              </nav>
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs text-muted-foreground">{t("header.version")}</p>
                <LanguageSwitcher className="mt-3" />
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
        </div>

        <nav className="hidden items-center justify-center gap-1 lg:flex">
          {links.map((l) => {
            const active = path === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
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
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {isSignedIn && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm font-medium">
                  <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold uppercase">
                    {profile.username.slice(0, 1)}
                  </span>
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
              <Button
                asChild
                className="h-10 max-w-[9.5rem] whitespace-normal px-3 text-center text-sm leading-tight sm:max-w-none sm:px-5"
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
