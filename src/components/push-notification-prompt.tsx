import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useSession } from "@/components/session";
import { useTranslation } from "react-i18next";
import { enablePushNotifications, getPushStatus, supportsWebPush } from "@/lib/push-notifications";

const DISMISS_KEY = "puntr:push-prompt-dismissed-until";

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PushNotificationPrompt() {
  const { profile, loading } = useSession();
  const { t } = useTranslation("common");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !profile || !supportsWebPush() || !isStandalone() || Notification.permission !== "default") return;
    let active = true;
    try {
      if (Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now()) return;
    } catch { /* Continue without persistent dismissal state. */ }
    const timer = window.setTimeout(() => {
      void getPushStatus().then((status) => {
        if (active && !status.enabled) setShow(true);
      }).catch(() => undefined);
    }, 12_000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [loading, profile]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await enablePushNotifications();
      setShow(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 14 * 24 * 60 * 60 * 1000)); } catch { /* Session-only dismissal. */ }
    setShow(false);
  }

  if (!show) return null;
  return (
    <aside className="fixed inset-x-3 z-[95] mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0D0D0D] p-4 text-white shadow-2xl" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }} aria-label="Puntr notification preferences">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#16A34A]/15 text-[#4ADE80]"><Bell className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold">{t("pwa.push.title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/65">{t("pwa.push.body")}</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-white/55 hover:bg-white/10"><X className="size-4" /></button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => void enable()} className="flex-1 rounded-xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold disabled:opacity-50">{busy ? t("pwa.push.enabling") : t("pwa.push.allow")}</button>
        <button type="button" onClick={dismiss} className="rounded-xl px-3 py-2.5 text-xs font-semibold text-white/65 hover:bg-white/10">{t("pwa.push.notNow")}</button>
      </div>
    </aside>
  );
}
