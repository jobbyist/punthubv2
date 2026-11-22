import { supabase } from "@/integrations/supabase/client";

type PushStatus = { enabled: boolean; activeCount: number; permission: NotificationPermission | "unsupported" };

export async function pushApiRequest<T = Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Please sign in again to manage push notifications.");
  const response = await fetch("/api/push", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Push notification request failed.");
  return result;
}

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
  const data = await pushApiRequest<{ enabled: boolean; activeCount: number }>({ action: "status" });
  return {
    enabled: Boolean(data?.enabled),
    activeCount: Number(data?.activeCount ?? 0),
    permission: Notification.permission,
  };
}

export async function enablePushNotifications(source: "account" | "pwa_prompt" = "account"): Promise<void> {
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
      applicationServerKey: decodeVapidKey(publicKey).buffer as ArrayBuffer,
    });
  }
  try {
    await pushApiRequest({ action: "subscribe", subscription: subscription.toJSON(), userAgent: navigator.userAgent.slice(0, 300) });
  } catch (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
  const { error: consentError } = await supabase.rpc("record_consent", {
    p_purpose: "push_notifications",
    p_granted: true,
    p_notice_version: "push-notifications-v1",
    p_source: source,
  });
  if (consentError) {
    await subscription.unsubscribe().catch(() => false);
    await pushApiRequest({ action: "unsubscribe" }).catch(() => undefined);
    throw consentError;
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (supportsWebPush()) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }
  await pushApiRequest({ action: "unsubscribe" });
  const { error: consentError } = await supabase.rpc("record_consent", {
    p_purpose: "push_notifications",
    p_granted: false,
    p_notice_version: "push-notifications-v1",
    p_source: "account",
  });
  if (consentError) throw consentError;
}
