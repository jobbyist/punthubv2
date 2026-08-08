import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/components/session";

export const primaryNav = [
  { label: "Predictions", to: "/predictions" },
  { label: "Leaderboards", to: "/leaderboards" },
  { label: "Results", to: "/results" },
  { label: "Community", to: "/community" },
  { label: "Insights", to: "/insights" },
  { label: "How it works", to: "/how-it-works", guestOnly: true },
  { label: "Pricing", to: "/pricing", guestOnly: true },
  { label: "Support", to: "/support" },
] as const;

export function SiteHeader() {
  const { isGuest, openEarlyAccess } = useSession();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Signed-in (guest session) users don't need the marketing pages in the nav.
  const links = primaryNav.filter((l) => !("guestOnly" in l && l.guestOnly && isGuest));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:h-[70px]">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="grid size-9 shrink-0 place-items-center rounded-lg lg:hidden" aria-label="Open menu">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
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
                    <span
                      className={`size-1.5 rounded-full transition-opacity ${
                        l.to === "data-[status=active]"
                          ? "bg-primary opacity-100"
                          : "bg-muted-foreground opacity-0 group-hover:opacity-50"
                      }`}
                    />
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs text-muted-foreground">
                  Version 2.0 - © 2026 Puntr
                </p>
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
                {l.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-primary lg:-bottom-[13px]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {isGuest ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-primary tnum sm:inline-flex">
                0 PP
              </span>
              <button
                aria-label="Notifications"
                onClick={() => openEarlyAccess("Notifications unlock when your beta invite lands.")}
                className="hidden size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted sm:grid"
              >
                <Bell className="size-[18px]" />
              </button>
              <button
                onClick={() => openEarlyAccess()}
                className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm font-medium"
              >
                <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">G</span>
                <span className="hidden sm:inline">Guest</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <Button onClick={() => openEarlyAccess()} className="h-10 px-5">
              Get early access
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
