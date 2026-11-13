import { Link } from "@tanstack/react-router";
import {
  AtSign,
  BellRing,
  Check,
  Clock,
  Gift,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "@/components/session";
import { SocialIcon } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { points } from "@/lib/format";
import { notifyPointsChanged } from "@/lib/rewards-data";
import {
  claimDeviceQuest,
  loadQuests,
  runningInstalled,
  startQuest,
  submitQuest,
  type QuestRow,
  type QuestSummary,
} from "@/lib/quests";
import type { SocialKey } from "@/lib/social";

const SOCIAL: Record<string, SocialKey> = {
  follow_instagram: "instagram",
  like_facebook: "facebook",
  follow_x: "x",
  follow_tiktok: "tiktok",
  join_whatsapp: "whatsapp",
  join_telegram: "telegram",
};
const ICON: Record<string, LucideIcon> = {
  confirm_email: Mail,
  enable_mfa: ShieldCheck,
  complete_profile: UserRoundCheck,
  verify_identity: UserRoundCheck,
  email_updates: Mail,
  whatsapp_updates: MessageCircle,
  push_notifications: BellRing,
  install_app: Smartphone,
  refer_friend: Users,
};

/**
 * "Get started, earn PuntPoints": every quest is checked before points are given (automatic checks in the database,
 * device checks in the app, or an admin review for social follows).
 */
export function QuestsChecklist({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("quests");
  const { profile } = useSession();
  const [summary, setSummary] = useState<QuestSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (!profile) return;
    try {
      const r = await loadQuests(profile.id);
      setSummary(r.summary);
      if (r.newlyAwarded > 0) {
        toast.success(t("awarded", { points: points(r.newlyAwarded) }));
        notifyPointsChanged();
      }
    } catch {
      setFailed(true);
    }
  }, [profile, t]);

  useEffect(() => {
    void reload();
    // Re-check automatic quests when the member comes back to the tab (e.g. after turning on two-step).
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  if (!profile || failed) return null;
  if (!summary)
    return <section className="card-surface mt-6 h-40 animate-pulse" aria-busy="true" />;

  const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  const rows = compact
    ? summary.rows.filter((r) => r.status !== "verified").slice(0, 6)
    : summary.rows;

  return (
    <section className="card-surface mt-6 overflow-hidden" aria-labelledby="quests-title">
      <div className="border-b border-border bg-foreground p-5 text-background">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <Gift className="size-4" aria-hidden="true" /> {t("eyebrow")}
        </p>
        <h2 id="quests-title" className="mt-1 text-xl text-background">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-background/70">
          {t("subtitle", { available: points(summary.available) })}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-2 flex-1 bg-background/20"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("progressLabel")}
          >
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold tnum">
            {t("progress", { done: summary.done, total: summary.total })}
          </span>
        </div>
        <p className="mt-2 text-xs text-background/70">
          {t("earned", { earned: points(summary.earned) })}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <QuestItem key={r.code} row={r} onChange={() => void reload()} />
        ))}
      </ul>
      {compact && (
        <div className="border-t border-border p-4 text-sm">
          <Link
            to="/account"
            hash="get-started"
            className="font-semibold text-primary hover:underline"
          >
            {t("seeAll")}
          </Link>
        </div>
      )}
      <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        {t("fineprint")}
      </p>
    </section>
  );
}

function QuestItem({ row, onChange }: { row: QuestRow; onChange: () => void }) {
  const { t } = useTranslation("quests");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const social = SOCIAL[row.code];
  const Icon = ICON[row.code] ?? AtSign;
  const done = row.status === "verified";

  async function open() {
    try {
      await startQuest(row.code);
    } catch {
      /* the link still opens; submitting will ask to open it first */
    }
    if (row.action_url?.startsWith("http"))
      window.open(row.action_url, "_blank", "noopener,noreferrer");
    onChange();
  }
  async function submit() {
    setBusy(true);
    try {
      await submitQuest(row.code, handle);
      toast.success(t("submitted"));
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        t(
          `error.${["open_link_first", "too_soon", "bad_evidence"].includes(msg) ? msg : "generic"}`,
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function claimDevice() {
    const code = row.code as "install_app" | "push_notifications";
    if (code === "install_app" && !runningInstalled())
      return void toast.error(t("error.notInstalled"));
    if (
      code === "push_notifications" &&
      (typeof Notification === "undefined" || Notification.permission !== "granted")
    )
      return void toast.error(t("error.pushOff"));
    setBusy(true);
    try {
      const n = await claimDeviceQuest(code);
      if (n > 0) {
        toast.success(t("awarded", { points: points(n) }));
        notifyPointsChanged();
      }
      onChange();
    } catch {
      toast.error(t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`flex flex-wrap items-start gap-3 p-4 ${done ? "bg-primary-soft/30" : ""}`}>
      <span
        className={`grid size-10 shrink-0 place-items-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
      >
        {done ? (
          <Check className="size-5" aria-hidden="true" />
        ) : social ? (
          <SocialIcon name={social} className="size-5" />
        ) : (
          <Icon className="size-5" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {row.title}
          <span className="bg-foreground px-1.5 py-0.5 text-[11px] font-bold text-background tnum">
            +{points(row.points)}
          </span>
          {row.coming_soon && (
            <span className="border border-border px-1.5 text-[11px] text-muted-foreground">
              {t("soon")}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
        {row.status === "submitted" && (
          <p className="mt-1 flex items-center gap-1 text-xs text-primary">
            <Clock className="size-3.5" aria-hidden="true" />{" "}
            {t("checking", { handle: row.evidence ?? "" })}
          </p>
        )}
        {row.status === "rejected" && (
          <p className="mt-1 text-xs text-destructive">
            {t("rejected")}
            {row.reviewNote ? ` ${row.reviewNote}` : ""}
          </p>
        )}
        {!done &&
          !row.coming_soon &&
          row.verification === "review" &&
          (row.status === "started" || row.status === "rejected") && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                className="h-9 max-w-[240px]"
                placeholder={row.handle_label ?? t("handle")}
                value={handle}
                maxLength={120}
                onChange={(e) => setHandle(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || handle.trim().length < 2}
                onClick={() => void submit()}
              >
                {t("submit")}
              </Button>
            </div>
          )}
      </div>
      <div className="shrink-0">
        {done ? (
          <span className="text-xs font-semibold text-primary">{t("done")}</span>
        ) : row.coming_soon ? null : row.verification === "review" ? (
          row.status === "todo" && (
            <Button size="sm" onClick={() => void open()}>
              {t(`cta.${row.code}`, { defaultValue: t("cta.open") })}
            </Button>
          )
        ) : row.verification === "device" ? (
          <Button size="sm" disabled={busy} onClick={() => void claimDevice()}>
            {t("cta.check")}
          </Button>
        ) : row.action_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.action_url}>{t("cta.go")}</a>
          </Button>
        ) : null}
      </div>
    </li>
  );
}
