import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Menu, Target, Trophy, Users } from "lucide-react";

import { useSession } from "@/components/session";

const items = [
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "Community", to: "/community", icon: Users },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
  { label: "More", to: "/support", icon: Menu },
] as const;

export function MobileNav() {
  const { isGuest } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Hidden until the visitor is signed in or browsing as a guest.
  if (!isGuest) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ label, to, icon: Icon }) => {
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
      </ul>
    </nav>
  );
}
