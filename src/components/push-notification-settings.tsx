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
        await enablePushNotifications(¶»§q«^