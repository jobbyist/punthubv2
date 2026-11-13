import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: string | null;
  target_url: string | null;
  published_at: string;
  read: boolean;
}

type Status = "loading" | "ready" | "error";

/**
 * Recent team updates for the bell, with the signed-in member's own read state. RLS limits every row to what the
 * member may see: published notifications for everyone, read rows for their own user only.
 * Realtime is subscribed when the table is available; if it is not (or the channel fails) the list simply
 * refreshes when the dropdown opens.
 */
export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const load = useCallback(async () => {
    // userId comes from Supabase Auth; refuse anything that is not a UUID before it goes into a filter string.
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))
      return;
    try {
      const [{ data: notes, error: e1 }, { data: reads, error: e2 }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, message, category, target_url, published_at")
          .lte("published_at", new Date().toISOString())
          // Admins can read private notices through RLS; the bell shows only broadcasts and the member's own.
          .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
          .order("published_at", { ascending: false })
          .limit(20),
        supabase
          .from("user_notifications")
          .select("notification_id, read_at")
          .eq("user_id", userId),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      const readIds = new Set(
        ((reads ?? []) as { notification_id: string; read_at: string | null }[])
          .filter((r) => r.read_at)
          .map((r) => r.notification_id),
      );
      setItems(
        ((notes ?? []) as Omit<AppNotification, "read">[]).map((n) => ({
          ...n,
          read: readIds.has(n.id),
        })),
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void load();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => void load(),
      )
      .subscribe();
    // Scheduled notices fire no realtime event when their time arrives, so refresh every 5 minutes as well.
    const timer = setInterval(() => void load(), 5 * 60_000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!userId || ids.length === 0) return;
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      const now = new Date().toISOString();
      const { error } = await supabase.from("user_notifications").upsert(
        ids.map((id) => ({ user_id: userId, notification_id: id, read_at: now })),
        { onConflict: "user_id,notification_id" },
      );
      if (error) {
        setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: false } : n)));
        void load();
      }
    },
    [userId, load],
  );

  const unread = items.filter((n) => !n.read).length;
  return { items, status, unread, markRead, reload: load };
}
