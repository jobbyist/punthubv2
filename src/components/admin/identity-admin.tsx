import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { getIdentityQueue, reviewIdentity } from "@/lib/identity.functions";

/** Manual identity checks. The server re-checks the admin role on every call. */
export function IdentityTab() {
  const { t } = useTranslation("admin");
  const load = useServerFn(getIdentityQueue);
  const review = useServerFn(reviewIdentity);
  const [tick, setTick] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { data, failed } = useAsync(() => load(), [tick]);

  const decide = async (userId: string, approve: boolean) => {
    setBusy(userId);
    try {
      const reason = reasons[userId]?.trim();
      const res = await review({ data: { userId, approve, ...(reason ? { reason } : {}) } });
      if (res.ok) toast.success(t("identity.done"));
      else toast.error(t("identity.error"));
    } catch {
      toast.error(t("identity.error"));
    } finally {
      setBusy(null);
      setTick((n) => n + 1);
    }
  };

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("identity.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("identity.intro")}</p>
      {failed && <p className="mt-4 text-sm text-destructive">{t("identity.loadError")}</p>}
      {data && data.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">{t("identity.empty")}</p>
      )}
      <ul className="mt-4 divide-y divide-border">
        {(data ?? []).map((r) => {
          const name =
            [r.first_name, r.last_name].filter(Boolean).join(" ") || r.display_name || "-";
          return (
            <li key={r.user_id} className="space-y-2 py-4 text-sm">
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">{t("identity.member")}</dt>
                <dd className="font-semibold">{r.username}</dd>
                <dt className="text-muted-foreground">{t("identity.name")}</dt>
                <dd>{name}</dd>
                <dt className="text-muted-foreground">{t("identity.birthYear")}</dt>
                <dd className="tnum">{r.birth_year ?? "-"}</dd>
                <dt className="text-muted-foreground">{t("identity.submitted")}</dt>
                <dd>{formatDateTime(r.submitted_at)}</dd>
              </dl>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-primary underline"
                >
                  {t("identity.view")}
                </a>
              ) : (
                <p className="text-destructive">{t("identity.noDoc")}</p>
              )}
              <Input
                aria-label={t("identity.reason")}
                placeholder={t("identity.reason")}
                maxLength={300}
                value={reasons[r.user_id] ?? ""}
                onChange={(e) => setReasons((m) => ({ ...m, [r.user_id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy === r.user_id || !r.url}
                  onClick={() => decide(r.user_id, true)}
                >
                  {t("identity.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.user_id}
                  onClick={() => decide(r.user_id, false)}
                >
                  {t("identity.reject")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
