import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { disablePushNotifications, enablePushNotifications, getPushStatus, supportsWebPush } from "@/lib/push-notifications";

export function PushNotificationSettings() {
  const { user } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    void getPushStatus().then((status) => {
      if (!active) return;
      setEnabled(status.enabled);
      setPermission(status.permission);
    }).catch(() => {
      if (active) toast.error("Couldn't load notification settings.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  async function toggle() {
    setBusy(true);
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
        toast.success("Push notifications turned off on your Puntr account.");
      } else {
        await enablePushNotifications();
        setEnabled(true);
        setPermission(Notification.permission);
        toast.success("Push notifications are on.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update push notification settings.");
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
          <h2 className="text-lg font-semibold">Push notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get important Puntr updates on this device, including announcements and matchday alerts. You can turn them off at any time.
          </p>
          {!supportsWebPush() && <p className="mt-2 text-xs text-muted-foreground">This browser does not support web push notifications.</p>}
          {permission === "denied" && <p className="mt-2 text-xs text-amber-600">Notifications are blocked by your browser. Change the site permission in your browser settings before enabling them here.</p>}
        </div>
      </div>
      <Button className="mt-4" variant={enabled ? "outline" : "default"} disabled={loading || busy || !supportsWebPush()} onClick={() => void toggle()}>
        {(loading || busy) && <LoaderCircle className="mr-2 size-4 animate-spin" />}
        {loading ? "Loading…" : busy ? "Updating…" : enabled ? "Turn off push notifications" : "Enable push notifications"}
      </Button>
    </section>
  );
}
