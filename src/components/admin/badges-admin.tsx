import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import {
  adminBadgeOverview,
  adminRejectBadge,
  adminRunBadges,
  adminSetBadge,
  type BadgeRow,
} from "@/lib/badges.functions";
import { formatDateTime } from "@/lib/format";

/** Team badges: every team in fixtures must carry its real badge before its fixtures are listed. */
export function TeamBadgesPanel() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, loading } = useAsync(() => adminBadgeOverview(), [tick]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await adminRunBadges();
      if (r.ok)
        toast.success(t("badges.ran", { verified: r.verified, failed: r.failed, due: r.due }));
      else toast.error(r.message);
      setTick((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const missing = (data ?? []).filter((r) => r.status !== "verified").length;

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("badges.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("badges.body")}</p>
      {data && (
        <p className="mt-3 text-sm font-semibold">
          {t("badges.summary", { total: data.length, missing })}
        </p>
      )}
      <Button className="mt-3" disabled={busy} onClick={() => void run()}>
        {busy ? t("badges.running") : t("badges.run")}
      </Button>
      {loading && !data && <p className="mt-3 text-sm text-muted-foreground">…</p>}
      {data && (
        <ul className="mt-4 divide-y divide-border">
          {data.map((r) => (
            <BadgeItem
              key={`${r.sport}:${r.name}`}
              row={r}
              onChange={() => setTick((n) => n + 1)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function BadgeItem({ row, onChange }: { row: BadgeRow; onChange: () => void }) {
  const { t } = useTranslation("admin");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const team = { name: row.name, sport: row.sport, competition: row.competition };

  async function save() {
    setBusy(true);
    try {
      const r = await adminSetBadge({ data: { ...team, url } });
      if (r.ok) {
        setUrl("");
        onChange();
      } else toast.error(r.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    if (!window.confirm(t("badges.rejectConfirm", { team: row.name }))) return;
    const r = await adminRejectBadge({ data: team });
    if (r.ok) onChange();
    else toast.error(r.message);
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3 text-sm">
      {row.logoUrl ? (
        <img
          src={row.logoUrl}
          alt=""
          className="size-10 rounded-full bg-white object-contain p-0.5 ring-1 ring-border"
        />
      ) : (
        <span className="grid size-10 place-items-center rounded-full bg-muted text-xs font-bold text-destructive ring-1 ring-border">
          ?
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {row.name} <span className="font-normal text-muted-foreground">· {row.competition}</span>
        </p>
        <p
          className={
            row.status === "verified" ? "text-xs text-primary" : "text-xs text-destructive"
          }
        >
          {t(`badges.status.${row.status}`)}
          {row.method ? ` · ${row.method}` : ""}
          {row.lastError && row.status !== "verified" ? ` · ${row.lastError}` : ""}
          {row.checkedAt ? ` · ${formatDateTime(row.checkedAt)}` : ""}
        </p>
        {row.sourcePage && (
          <a
            href={row.sourcePage}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-muted-foreground underline"
          >
            {t("badges.source")}
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-56"
          placeholder={t("badges.urlPlaceholder")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          size="sm"
          disabled={busy || !url.startsWith("https://")}
          onClick={() => void save()}
        >
          {t("badges.set")}
        </Button>
        {row.status === "verified" && (
          <Button size="sm" variant="outline" onClick={() => void reject()}>
            {t("badges.reject")}
          </Button>
        )}
      </div>
    </li>
  );
}
