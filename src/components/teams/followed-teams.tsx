import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TeamLogo } from "@/components/team-logo";
import { formatDate } from "@/lib/format";
import { teamSlug } from "@/lib/pfie/teams";
import { useTeamFollows } from "@/lib/teams/follows";

/** Account section: the teams a member follows (private to them), with quick unfollow. */
export function FollowedTeams() {
  const { t } = useTranslation("teams");
  const reduce = useReducedMotion();
  const follows = useTeamFollows();
  if (!follows.available || !follows.loaded) return null;

  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="followed-teams-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="followed-teams-title" className="text-lg">
            {t("profile.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("profile.body")}</p>
        </div>
        <Link
          to="/teams"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {t("profile.browse")}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
      {follows.follows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("profile.empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {follows.follows.map((f) => (
              <motion.li
                key={`${f.sport}:${f.teamKey}`}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 border border-border py-1 pl-1 pr-1.5"
              >
                <TeamLogo team={f.teamName} sport={f.sport} size="sm" />
                <Link
                  to="/teams/$slug"
                  params={{ slug: teamSlug(f.teamName) }}
                  className="text-sm font-semibold hover:underline"
                  title={t("profile.since", { date: formatDate(f.createdAt) })}
                >
                  {f.teamName}
                </Link>
                <button
                  type="button"
                  className="grid size-6 place-items-center text-muted-foreground hover:text-foreground"
                  aria-label={t("follow.unfollow", { team: f.teamName })}
                  disabled={follows.pending === f.teamKey}
                  onClick={() =>
                    void follows
                      .toggle({ key: f.teamKey, name: f.teamName, sport: f.sport }, "account")
                      .then(() => toast.success(t("follow.unfollowed", { team: f.teamName })))
                      .catch(() => toast.error(t("follow.error")))
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
