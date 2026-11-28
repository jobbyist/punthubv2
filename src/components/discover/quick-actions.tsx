import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  CalendarDays,
  ClipboardCheck,
  Gamepad2,
  ListOrdered,
  Newspaper,
  Radio,
  ReceiptText,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useUserContext } from "@/components/user-context";
import type { Segment } from "@/lib/user-context";

type Tile = { key: string; to: string; icon: LucideIcon };

const ALL: Record<string, Tile> = {
  fixtures: { key: "fixtures", to: "/fixtures", icon: CalendarDays },
  live: { key: "live", to: "/live-scores", icon: Radio },
  results: { key: "results", to: "/results", icon: ClipboardCheck },
  tables: { key: "tables", to: "/tables", icon: ListOrdered },
  duels: { key: "duels", to: "/duels", icon: Swords },
  practice: { key: "practice", to: "/practice", icon: Gamepad2 },
  leaderboards: { key: "leaderboards", to: "/leaderboards", icon: Trophy },
  slips: { key: "slips", to: "/slips", icon: ReceiptText },
  community: { key: "community", to: "/forum", icon: Users },
  newsroom: { key: "newsroom", to: "/newsroom", icon: Newspaper },
};

/** Order follows what each kind of visitor reaches for first. Eight tiles: two rows on desktop, four on phones. */
const ORDER: Record<Segment, string[]> = {
  "guest-first": [
    "fixtures",
    "results",
    "tables",
    "leaderboards",
    "live",
    "newsroom",
    "duels",
    "community",
  ],
  "guest-returning": [
    "fixtures",
    "live",
    "tables",
    "results",
    "leaderboards",
    "duels",
    "newsroom",
    "community",
  ],
  "member-onboarding": [
    "fixtures",
    "practice",
    "duels",
    "tables",
    "live",
    "results",
    "leaderboards",
    "slips",
  ],
  "member-active": [
    "fixtures",
    "live",
    "duels",
    "leaderboards",
    "results",
    "tables",
    "slips",
    "practice",
  ],
};

/** The jump-off grid: every main destination one tap away, ordered for the person looking at it. */
export function QuickActions({ liveCount }: { liveCount: number }) {
  const { t } = useTranslation("predictions");
  const ctx = useUserContext();
  const order = ORDER[ctx.ready ? ctx.segment : "guest-first"];
  return (
    <nav aria-label={t("hub.navLabel")} className="mb-8">
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {order.map((id, i) => {
          const { key, to, icon: Icon } = ALL[id]!;
          return (
            <motion.li
              key={key}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035, type: "spring", stiffness: 340, damping: 28 }}
            >
              <Link
                to={to as never}
                className="group relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 active:scale-[0.98] sm:p-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
                />
                <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:-rotate-6">
                  <Icon className="size-5" aria-hidden />
                  {key === "live" && liveCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tnum">
                      {liveCount}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold">
                    {t(`discover.tiles.${key}.title`)}
                  </span>
                  <span className="line-clamp-2 block text-xs leading-snug text-muted-foreground">
                    {t(`discover.tiles.${key}.body`)}
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
