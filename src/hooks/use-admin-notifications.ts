import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface AdminNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  sms_body: string | null;
  created_at: string;
}

/**
 * Open admin notifications, kept live with Supabase Realtime (postgres_changes on admin_notifications).
 * Row level security applies to Realtime too, so only admins ever receive these.
 */
export function useAdminNotifications(enabled: boolean, onNew?: (n: AdminNotification) => void) {
  const [items, setItems] = useState<AdminNotification[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("id, kind, title, body, sms_body, created_at")
      .is("done_at", null)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as AdminNotification[]);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          onNew?.(payload.new as AdminNotification);
          void load();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_notifications" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // onNew is read once per subscription on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, load]);

  const markDone = useCallback(
    async (id: string) => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return false;
      const { error } = await supabase
        .from("admin_notifications")
        .update({ done_at: new Date().toISOString(), done_by: me.user.id })
        .eq("id", id);
      if (!error) await load();
      return !error;
    },
    [load],
  );

  return { items, markDone };
}
