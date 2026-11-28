import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { useTeamFollows } from "@/lib/teams/follows";
import { cn } from "@/lib/utils";

type Follows = ReturnType<typeof useTeamFollows>;

/**
 * Follow toggle with a small pop and burst on follow. Signed-out visitors get a link to join; when the follows
 * migration is not applied yet the button is not rendered at all.
 */
export function FollowButton({
  team,
  follows,
  source,
  size = "sm",
  className,
}: {
  team: { key: string; name: string };
  follows: Follows;
  source: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useTranslation("teams");
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  if (!follows.available) return null;
  const pad = size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs";

  if (!follows.isSignedIn)
    return (
      <Link
        to="/join"
        title={t("follow.signIn")}
        aria-label={t("follow.followTeam", { team: team.name })}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 border border-border font-semibold transition-colors hover:border-primary hover:text-primary",
          pad,
          className,
        )}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("follow.follow")}
      </Link>
    );

  const on = follows.isFollowing(team.key);
  const busy = follows.pending === team.key;
  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const now = await follows.toggle(team, source);
      if (now) setBurst((b) => b + 1);
      toast.success(t(now ? "follow.followed" : "follow.unfollowed", { team: team.name }));
    } catch (error) {
      const msg = (error as { message?: string }).message ?? "";
      toast.error(t(/follow_limit/.test(msg) ? "follow.limit" : "follow.error"));
    }
  };

  return (
    <motion.button
      type="button"
      onClick={(e) => void click(e)}
      disabled={busy}
      aria-pressed={on}
      aria-label={t(on ? "follow.unfollow" : "follow.followTeam", { team: team.name })}
      whileTap={reduce ? {} : { scale: 0.92 }}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 overflow-visible font-semibold transition-colors disabled:opacity-70",
        pad,
        on
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border hover:border-primary hover:text-primary",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={on ? "on" : "off"}
          initial={reduce ? false : { scale: 0.4, rotate: on ? -90 : 0, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 26 }}
          className="grid place-items-center"
        >
          {on ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Plus className="size-3.5" aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
      {on ? t("follow.following") : t("follow.follow")}
      {on && burst > 0 && !reduce && (
        <span key={burst} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 size-1 bg-primary"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i / 6) * Math.PI * 2) * 22,
                y: Math.sin((i / 6) * Math.PI * 2) * 16,
                opacity: 0,
                scale: 0.4,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          ))}
        </span>
      )}
    </motion.button>
  );
}
