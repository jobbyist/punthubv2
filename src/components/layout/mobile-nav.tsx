import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Menu, Target, Trophy, Users, X, Home, TrendingUp, HelpCircle, DollarSign, Info } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/session";

const items = [
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "Community", to: "/community", icon: Users },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
] as const;

const moreMenuItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Predictions", to: "/predictions", icon: Target },
  { label: "Results", to: "/results", icon: BarChart3 },
  { label: "Community", to: "/community", icon: Users },
  { label: "Leaderboards", to: "/leaderboards", icon: Trophy },
  { label: "Insights", to: "/insights", icon: TrendingUp },
  { label: "How it works", to: "/how-it-works", icon: Info },
  { label: "Pricing", to: "/pricing", icon: DollarSign },
  { label: "Support", to: "/support", icon: HelpCircle },
] as const;

export function MobileNav() {
  const { isGuest } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Hidden on the homepage.
  if (path === "/") return null;

  return (
    <>
      {/* Full Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="grid size-10 place-items-center rounded-lg hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <nav className="space-y-2">
                {moreMenuItems.map(({ label, to, icon: Icon }) => {
                  const active = path === to;
                  return (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-colors ${
                        active
                          ? "bg-primary-soft text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="size-6" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Additional Info Section */}
              <div className="mt-8 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold">Need Help?</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Check out our support resources or contact our team.
                  </p>
                  <Link
                    to="/support"
                    onClick={() => setIsMenuOpen(false)}
                    className="mt-3 inline-flex items-center text-sm font-medium text-primary"
                  >
                    Visit Support Center →
                  </Link>
                </div>
              </div>
            </div>
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
