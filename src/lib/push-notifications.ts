import { supabase } from "@/integrations/supabase/client";

type PushStatus = { enabled: boolean; activeCount: number; permission: NotificationPermission | "unsupported" };

function decodeVapidKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function supportsWebPush(): boolean {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supportsWebPush()) return { enabled: false, activeCount: 0, permission: "unsupported" };
  const { data, error } = await supabase.functions.invoke("push-notifications", { body: { action: "status" } });
  if (error) throw error;
  return {
    enabled: Boolean(data?.enabled),
    activeCount: Number(data?.activeCount ?? 0),
    permission: Notification.permission,
  };
}

export async function enablePushNotifications(): Promise<void> {
  if (!supportsWebPush()) throw new Error("Push notifications are not supported by this browser.");
  const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  if (!publicKey) throw new Error("Puntr push notifications are not configured yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked in browser settings." : "Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(publicKey),
    });
  }
  const { error } = await supabase.functions.invoke("push-notifications", {
    body: { action: "subscribe", subscription: subscription.toJSON(), userAgent: navigator.userAgent.slice(0, 300) },
  });
  if (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
  const { error: consentError } = await supabase.rpc("record_consent", {
    p_purpose: "push_notifications",
    p_granted: true,
    p_notice_version: "push-notifications-v1",
    p_source: "account",
  });
  if (consentError) {
    await subscription.unsubscribe().catch(() => false);
    await supabase.functions.invoke("push-notifications", { body: { action: "unsubscribe" } });
    throw consentError;
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (supportsWebPush()) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }
  const { error } = await supabase.functions.invoke("push-notifications", { body: { action: "unsubscribe" } });
  if (error) throw error;
  const { error: consentError } = await supabase.rpc("record_consent", {
    p_purpose: "push_notifications",
    p_granted: false,
    p_notice_version: "push-notifications-v1",
    p_source: "account",
  });
  if (consentError) throw consentError;
}
