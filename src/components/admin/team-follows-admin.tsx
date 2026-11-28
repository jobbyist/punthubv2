import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { TeamLogo } from "@/components/team-logo";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  members_following: number;
  total_follows: number;
  follows_7d: number;
  unfollows_7d: number;
  follows_30d: number;
  top_teams: {
    sport: string;
    team_key: string;
    team_name: string;
    followers: number;
    new_7d: number;
  }[];
  daily: { day: string; follows: number; unfollows: number }[];
}

/** Admin > Analytics: team follow totals and the most-followed teams (aggregates only, no member list). */
export function TeamFollowsPanel() {
  const { t } = useTranslation("teams");
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unavailable">("loading");

  useEffect(() => {
    void (supabase as unknown as SupabaseClient)
      .rpc("admin_team_follow_stats")
      .then(({ data, error }) => {
        if (error || !data) return setState("unavailable");
        setStats(data as Stats);
        setState("ok");
      });
  }, []);

  if (state === "loading") return null;
  const max = Math.max(1, ...(stats?.daily ?? []).map((d) => d.follows + d.unfollows));

  return (
    <section className="card-surface p-5" aria-labelledby="team-follows-admin">
      <h2 id="team-follows-admin" className="text-lg">
        {t("admin.title")}
      </h2>
      {state === "unavailable" || !stats ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.unavailable")}</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ["members", stats.members_following],
                ["total", stats.total_follows],
                ["follows7", stats.follows_7d],
                ["unfollows7", stats.unfollows_7d],
                ["follows30", stats.follows_30d],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="border border-border p-3">
                <dt className="text-[11px] text-muted-foreground">{t(`admin.${k}`)}</dt>
                <dd className="font-display text-xl font-extrabold tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {stats.daily.length > 0 && (
            <div className="mt-4 flex h-16 items-end gap-0.5" aria-hidden="true">
              {stats.daily.map((d) => (
                <div
                  key={d.day}
                  className="flex flex-1 flex-col justify-end"
                  title={`${d.day}: +${d.follows} / -${d.unfollows}`}
                >
                  <div
                    className="bg-destructive/60"
                    style={{ height: `${(d.unfollows / max) * 100}%` }}
                  />
                  <div className="bg-primary" style={{ height: `${(d.follows / max) * 100}%` }} />
                </div>
              ))}
            </div>
          )}
          <h3 className="mt-5 text-sm">{t("admin.top")}</h3>
          {stats.top_teams.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("admin.empty")}</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 font-semibold">{t("admin.team")}</th>
                  <th className="py-1 text-right font-semibold">{t("admin.followers")}</th>
                  <th className="py-1 text-right font-semibold">{t("admin.new7")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.top_teams.map((r) => (
                  <tr key={`${r.sport}:${r.team_key}`}>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <TeamLogo team={r.team_name} sport={r.sport} size="sm" />
                        {r.team_name}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tnum">{r.followers}</td>
                    <td className="py-1.5 text-right tnum">{r.new_7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
