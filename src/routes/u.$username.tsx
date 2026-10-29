import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PickCard } from "@/components/pick-card";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { formatDate, formatUnits, pct } from "@/lib/format";
import { fetchFeed, type FeedPick } from "@/lib/pick-data";
import { fetchPublicProfile, fetchTipsterStats } from "@/lib/records";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: `https://puntr.co.za/u/${params.username}` }],
    meta: [{ title: `${params.username} | Puntr` }],
  }),
  component: PublicProfile,
});

const PAGE = 20;
const CHIP: Record<string, string> = {
  W: "bg-primary-soft text-primary",
  L: "bg-destructive/10 text-destructive",
  V: "bg-muted text-muted-foreground",
};

/** A member's public record: stats, form and every pick. Nothing here can be edited or removed. */
function PublicProfile() {
  const { t } = useTranslation("account");
  const { username } = Route.useParams();
  const { profile: me } = useSession();
  const {
    data: profile,
    failed,
    loading,
  } = useAsync(() => fetchPublicProfile(username), [username]);
  const userId = profile?.id;
  const { data: stats } = useAsync(
    () => (userId ? fetchTipsterStats(userId) : Promise.resolve(undefined)),
    [userId],
  );

  const [picks, setPicks] = useState<FeedPick[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      if (!userId) return;
      setBusy(true);
      try {
        const page = await fetchFeed({ sort: "mine", userId, before, limit: PAGE });
        setPicks((prev) => (before && prev ? [...prev, ...page] : page));
        setMore(page.length === PAGE);
      } finally {
        setBusy(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (failed)
    return (
      <Shell>
        <p className="text-sm text-destructive">{t("record.error")}</p>
      </Shell>
    );
  if (loading) return <Shell>{null}</Shell>;
  if (!profile) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">{t("record.notFound")}</p>
        <Link to="/" className="mt-3 inline-block text-sm underline">
          ←
        </Link>
      </Shell>
    );
  }

  const cells = stats
    ? ([
        [String(stats.picks), t("record.stats.picks")],
        [String(stats.settled), t("record.stats.settled")],
        [
          stats.win_rate === null ? t("record.stats.noRoi") : pct(stats.win_rate, 0),
          t("record.stats.winRate"),
        ],
        [formatUnits(stats.units), t("record.stats.units")],
        [stats.roi === null ? t("record.stats.noRoi") : pct(stats.roi, 1), t("record.stats.roi")],
        [String(stats.settled), t("record.stats.sample")],
      ] as const)
    : [];

  return (
    <Shell>
      <h1 className="text-3xl">{profile.username}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {profile.founding_number
          ? t("record.founding", { number: profile.founding_number })
          : t("record.member")}
        {profile.created_at && ` · ${t("record.joined", { date: formatDate(profile.created_at) })}`}
      </p>

      {stats && (
        <section className="card-surface mt-6 p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cells.map(([v, l]) => (
              <div key={l}>
                <p
                  className={`font-display text-2xl font-extrabold tnum ${v.startsWith("+") ? "text-primary" : ""}`}
                >
                  {v}
                </p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{t("record.stats.form")}</p>
            {stats.form_last_10 ? (
              <p className="mt-1 flex flex-wrap items-center gap-1">
                {stats.form_last_10.split("").map((c, i) => (
                  <span
                    key={i}
                    className={`grid size-7 place-items-center text-xs font-bold ${CHIP[c] ?? CHIP["V"]}`}
                  >
                    {c}
                  </span>
                ))}
                <span className="ml-2 text-[11px] text-muted-foreground">{t("record.legend")}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t("record.stats.formNone")}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {t("record.stats.sampleNote", { count: stats.settled })}
            </p>
          </div>
        </section>
      )}

      {me && me.id === profile.id && <ReferralCard />}

      <p className="mt-4 border border-border bg-primary-soft/50 p-3 text-sm font-semibold">
        {t("record.note")}
      </p>

      <h2 className="mb-3 mt-8 text-lg">{t("record.history")}</h2>
      {picks && picks.length === 0 && (
        <p className="card-surface p-5 text-sm text-muted-foreground">{t("record.empty")}</p>
      )}
      <div className="space-y-4">
        {(picks ?? []).map((p) => (
          <PickCard
            key={p.id}
            pick={p}
            fixture={p.fixture}
            teams={{ home: p.fixture?.home ?? "", away: p.fixture?.away ?? "" }}
            kickoff={p.fixture?.kickoff_at ?? p.created_at}
          />
        ))}
        {more && picks && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void load(picks[picks.length - 1]?.created_at)}
          >
            {t("record.loadMore")}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">{children}</div>;
}
