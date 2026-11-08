/**
 * Internal alerts to the single support inbox (support@puntr.co.za): Founding Member sign-ups, Annual Pass
 * reservations and similar events. Server-only.
 *
 * Each event is sent once: a unique index on the dedupe key (form_submissions_dedupe_idx) decides who wins a race, and a row in form_submissions (form = 'other') holds only the dedupe key and the event
 * name, no name or email, so repeat calls (a page reload, a resent email) do not alert twice. A failed send
 * never breaks the member's action; it is logged and the row keeps emailed = false.
 */
import { SUPPORT_INBOX, sendViaResend } from "@/lib/email/resend.server";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface SupportEvent {
  /** Short event name, for example "founding_signup". */
  event: string;
  /** Unique per occurrence, for example `founding:<user id>`. */
  key: string;
  subject: string;
  rows: [string, string][];
  replyTo?: string | undefined;
}

export async function notifySupportOnce(e: SupportEvent): Promise<void> {
  try {
    const { supabaseAdmin: typed } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = typed as any;
    const { data: existing } = await db
      .from("form_submissions")
      .select("id")
      .eq("form", "other")
      .eq("meta->>dedupe", e.key)
      .limit(1);
    if (existing && existing.length > 0) return;
    const { data: row, error } = await db
      .from("form_submissions")
      .insert({ form: "other", meta: { event: e.event, dedupe: e.key } })
      .select("id")
      .single();
    // 23505: another request recorded the same key first (unique index form_submissions_dedupe_idx). Skip quietly.
    if (error?.code === "23505") return;
    if (error || !row) {
      console.error("support notice not recorded", e.event, error?.message);
      return;
    }
    const table = e.rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#4B5563;">${esc(k)}</td><td style="padding:4px 0;font-weight:700;color:#111111;">${esc(v)}</td></tr>`,
      )
      .join("");
    const res = await sendViaResend({
      to: [SUPPORT_INBOX],
      ...(e.replyTo ? { reply_to: e.replyTo } : {}),
      subject: e.subject,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111111;"><h2 style="margin:0 0 12px;">${esc(e.subject)}</h2><table>${table}</table></div>`,
      text: `${e.subject}\n\n${e.rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`,
    });
    if (res.ok) await db.from("form_submissions").update({ emailed: true }).eq("id", row.id);
    else console.error(`support notice failed [${res.status}] ${e.event}`);
  } catch (err) {
    console.error("support notice threw", e.event, err);
  }
}
