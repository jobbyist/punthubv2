import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { LaunchStore } from "@/lib/launch-notify.server";

export function createLaunchStore(): LaunchStore {
  return {
    async recipients(wave) {
      const { data, error } = await supabaseAdmin.rpc("launch_recipients", { p_wave: wave });
      if (error) throw error;
      return (data ?? []).map((r) => ({ email: r.recipient_email, name: r.recipient_name }));
    },
    async logSend(row) {
      const { error } = await supabaseAdmin
        .from("launch_email_sends")
        .upsert({ ...row, sent_at: new Date().toISOString() }, { onConflict: "email,wave" });
      if (error) console.error("could not log launch send", error.message);
    },
    async createNotification(n) {
      const { error } = await supabaseAdmin.from("admin_notifications").insert({
        kind: n.kind,
        dedupe_key: n.dedupeKey,
        title: n.title,
        body: n.body,
        sms_body: n.smsBody,
      });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw error;
    },
    async adminEmails() {
      const out = new Set<string>();
      const extra = process.env["ADMIN_NOTIFY_EMAIL"]?.trim().toLowerCase();
      if (extra) out.add(extra);
      const { data } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
      for (const row of data ?? []) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.id);
        if (u.user?.email) out.add(u.user.email.toLowerCase());
      }
      return [...out];
    },
  };
}
