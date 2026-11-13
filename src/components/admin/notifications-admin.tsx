import { Bell } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import {
  adminDeleteNotification,
  adminNotificationsOverview,
  adminSendNotification,
} from "@/lib/admin-notifications.functions";
import { NOTIFICATION_CATEGORIES, type NotificationAudience } from "@/lib/admin-notifications";
import { formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";

/** Compose, schedule and withdraw in-app notifications (the header bell). */
export function NotificationsTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, failed, loading } = useAsync(() => adminNotificationsOverview(), [tick]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("Announcements");
  const [targetUrl, setTargetUrl] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [username, setUsername] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const reach =
    audience === "member" ? 1 : audience === "founding" ? data?.reach.founding : data?.reach.all;
  const valid =
    title.trim().length >= 3 &&
    message.trim().length >= 3 &&
    (audience !== "member" || username.trim().length >= 2);

  async function send() {
    setBusy(true);
    try {
      const res = await adminSendNotification({
        data: {
          title,
          message,
          category,
          targetUrl,
          audience,
          username,
          publishAt: publishAt ? new Date(publishAt).toISOString() : "",
        },
      });
      if (res.ok) {
        toast.success(publishAt ? t("notify.scheduled") : t("notify.sent"));
        setTitle("");
        setMessage("");
        setTargetUrl("");
        setUsername("");
        setPublishAt("");
        setTick((n) => n + 1);
      } else toast.error(res.message ?? t("notify.error"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("notify.error"));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function withdraw(id: string) {
    if (!window.confirm(t("notify.withdrawConfirm"))) return;
    const res = await adminDeleteNotification({ data: { id } });
    if (res.ok) setTick((n) => n + 1);
    else toast.error(res.message ?? t("notify.error"));
  }

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("notify.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("notify.body")}</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <Input
              placeholder={t("notify.titleField")}
              value={title}
              maxLength={140}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <Textarea
                placeholder={t("notify.messageField")}
                value={message}
                maxLength={400}
                rows={4}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground tnum">
                {message.length}/400
              </p>
            </div>
            <Input
              placeholder={t("notify.linkField")}
              value={targetUrl}
              maxLength={300}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notify.category")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {NOTIFICATION_CATEGORIES.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={category === c ? "default" : "outline"}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notify.audience")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["all", "founding", "member"] as const).map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={audience === a ? "default" : "outline"}
                    onClick={() => setAudience(a)}
                  >
                    {t(`notify.aud.${a}`)}
                  </Button>
                ))}
              </div>
              {audience === "member" && (
                <Input
                  className="mt-2 max-w-xs"
                  placeholder={t("notify.username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
            </div>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notify.schedule")}
              </span>
              <Input
                type="datetime-local"
                className="mt-2 max-w-xs"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {t("notify.scheduleHint")}
              </span>
            </label>
            {!confirming ? (
              <Button disabled={!valid || busy} onClick={() => setConfirming(true)}>
                {publishAt ? t("notify.scheduleButton") : t("notify.sendButton")}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 border border-primary p-3 text-sm">
                <span>{t("notify.confirm", { count: reach ?? 0 })}</span>
                <Button size="sm" disabled={busy} onClick={() => void send()}>
                  {t("notify.confirmYes")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
                  {t("notify.cancel")}
                </Button>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("notify.preview")}
            </p>
            <div className="mt-2 border border-border bg-background">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold">
                <Bell className="size-4" aria-hidden="true" /> {t("notify.previewHeader")}
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {category}
                  </span>
                  <span className="block truncate text-sm font-semibold">
                    {title || t("notify.titleField")}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {message || t("notify.messageField")}
                  </span>
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("notify.reach", { count: reach ?? 0 })}
            </p>
          </div>
        </div>
      </section>

      <section className={panel}>
        <h2 className="text-lg">{t("notify.historyTitle")}</h2>
        {loading && !data && <p className="mt-2 text-sm text-muted-foreground">…</p>}
        {failed && <p className="mt-2 text-sm text-muted-foreground">{t("notify.error")}</p>}
        {data && data.items.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{t("notify.none")}</p>
        )}
        {data && data.items.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.items.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {n.category ?? "—"} ·{" "}
                    {n.audience === "member" ? `@${n.recipient}` : t(`notify.aud.${n.audience}`)}
                    {n.scheduled ? ` · ${t("notify.isScheduled")}` : ""}
                  </p>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.publishedAt)}
                    {n.sentBy ? ` · ${t("notify.by", { who: n.sentBy })}` : ""} ·{" "}
                    {t("notify.reads", { count: n.reads })}
                  </p>
                </div>
                {n.sentBy !== "newsroom" && (
                  <Button size="sm" variant="outline" onClick={() => void withdraw(n.id)}>
                    {t("notify.withdraw")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
