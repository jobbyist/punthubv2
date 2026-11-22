import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useSession } from "@/components/session";
import { useTranslation } from "react-i18next";
import { enablePushNotifications, getPushStatus, supportsWebPush } from "@/lib/push-notifications";

const DISMISS_KEY = "puntr:push-prompt-dismissed-until";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PushNotificationPrompt() {
  const { profile, loading } = useSession();
  const { t } = useTranslation("common");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      loading ||
      !profile ||
      !supportsWebPush() ||
      !isStandalone() ||
      Notification.permission !== "default"
    )
      return;
    let active = true;
    try {
      if (Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now()) return;
    } catch {
      /* Continue without persistent dismissal state. */
    }
    const timer = window.setTimeout(() => {
      void getPushStatus()
        .then((status) => {
          if (active && !status.enabled) setShow(true);
        })
        .catch(() => undefined);
    }, 12_000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loading,¶»§q«^