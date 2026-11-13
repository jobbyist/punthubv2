import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime, points } from "@/lib/format";
import {
  adminQuestQueue,
  adminQuestReview,
  type QuestReviewRow,
} from "@/lib/quests-admin.functions";

export function QuestsTab() {
  const { t } = useTranslation("quests");
  const [tick, setTick] = useState(0);
  const { data, loading } = useAsync(() => adminQuestQueue(), [tick]);
  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("admin.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.body")}</p>
      {data && (
        <p className="mt-3 text-sm font-semibold">
          {t("admin.stats", {
            verified: data.stats.verified,
            waiting: data.stats.waiting,
            points: points(data.stats.points),
          })}
        </p>
      )}
      {loading && !data && <p className="mt-3 text-sm">…</p>}
      {data && data.rows.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t("admin.none")}</p>
      )}
      <ul className="mt-3 divide-y divide-border">
        {(data?.rows ?? []).map((r) => (
          <ReviewItem key={`${r.userId}:${r.quest}`} row={r} onDone={() => setTick((n) => n + 1)} />
        ))}
      </ul>
    </section>
  );
}

function ReviewItem({ row, onDone }: { row: QuestReviewRow; onDone: () => void }) {
  const { t } = useTranslation("quests");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function review(approve: boolean) {
    setBusy(true);
    try {
      const r = await adminQuestReview({
        data: { userId: row.userId, quest: row.quest, approve, note },
      });
      if (r.ok) onDone();
      else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="space-y-2 py-3 text-sm">
      <p>
        <span className="font-semibold">@{row.username}</span>
        {row.foundingNumber ? ` · #${row.foundingNumber}` : ""} · {row.title}
      </p>
      <p>
        <span className="bg-muted px-1.5 py-0.5 font-mono text-xs">{row.evidence}</span>{" "}
        <span className="text-xs text-muted-foreground">{formatDateTime(row.submittedAt)}</span>
        {row.actionUrl?.startsWith("http") && (
          <>
            {" "}
            ·{" "}
            <a
              href={row.actionUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs underline"
            >
              {t("admin.open")}
            </a>
          </>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void review(true)}>
          {t("admin.approve")}
        </Button>
        <Input
          className="h-9 max-w-[260px]"
          placeholder={t("admin.note")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void review(false)}>
          {t("admin.reject")}
        </Button>
      </div>
    </li>
  );
}
