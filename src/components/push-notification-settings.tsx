import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  supportsWebPush,
} from "@/lib/push-notifications";

export function PushNotificationSettings() {
  const { user } = useSession();
  const { t } = useTranslation("account");
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    void getPushStatus()
      .then((status) => {
        if (!active) return;
        setEnabled(status.enabled);
        setPermission(status.permission);
      })
      .catch(() => {
        if (active) toast.error(t("pushNotifications.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function toggle() {
    setBusy(true);
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
        toast.success(t("pushNotifications.disabled"));
      } else {
        await enablePushNotifications();
        setEnabled(true);
        setPermission(Notification.permission);
        toast.success(t("pushNotifications.enabled"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pushNotifications.error"));
      if (supportsWebPush()) setPermission(Notification.permission);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface mt-6 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t("pushNotifications.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("pushNotifications.body")}</p>
          {!supportsWebPush() && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("pushNotifications.unsupported")}
            </p>
          )}
          {permission === "denied" && (
            <p className="mt-2 text-xs text-amber-600">{t("pushNotifications.blocked")}</p>
          )}
        </div>
      </div>
      <Button
        className="mt-4"
        variant={enabled ? "outline" : "default"}
        disabled={loading || busy || !supportsWebPush()}
        onClick={() => void toggle()}
      >
        {(loading || busy) && <LoaderCircle className="mr-2 size-4 animate-spin" />}
        {loading
          ? t("pushNotifications.loading")
          : busy
            ? t("pushNotifications.updating")
            : enabled
              ? t("pushNotifications.disable")
              : t("pushNotifications.enable")}
      </Button>
    </section>
  );
}
