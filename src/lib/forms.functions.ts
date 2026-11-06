import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  form: z.enum(["support", "privacy_request", "survey", "report", "other"]),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  message: z.string().trim().max(4000).optional(),
  meta: z.record(z.string().max(60), z.string().max(300)).optional(),
  /** Honeypot: real people leave it empty. */
  website: z.string().max(0).optional(),
});

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Logs a form submission and emails it to support@puntr.co.za. Public (the support and privacy forms are
 * open to signed-out visitors), so it is size-limited, honeypotted and rate-limited per address and overall.
 * It never receives passwords or tokens. Delivery failure does not lose the submission: it stays in
 * form_submissions with emailed = false.
 */
export const submitForm = createServerFn({ method: "POST" })
  .validator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (data.website) return { ok: true };
    const { supabaseAdmin: typed } = await import("@/integrations/supabase/client.server");
    // The table is new; types.ts is regenerated after the migration, so use a loose view until then.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = typed as any;
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count: total } = await db
      .from("form_submissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((total ?? 0) > 300) return { ok: false, error: "busy" };
    if (data.email) {
      const { count } = await db
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("email", data.email);
      if ((count ?? 0) >= 5) return { ok: false, error: "rate_limited" };
    }
    const { data: row, error } = await db
      .from("form_submissions")
      .insert({
        form: data.form,
        name: data.name ?? null,
        email: data.email ?? null,
        message: data.message ?? null,
        meta: data.meta ?? {},
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false, error: "save_failed" };

    try {
      const { SUPPORT_INBOX, sendViaResend } = await import("@/lib/email/resend.server");
      const rows = [
        ["Form", data.form],
        ["Name", data.name ?? "-"],
        ["Email", data.email ?? "-"],
        ...Object.entries(data.meta ?? {}),
      ]
        .map(
          ([k = "", v = ""]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#4B5563;">${esc(k)}</td><td style="padding:4px 0;font-weight:700;">${esc(String(v))}</td></tr>`,
        )
        .join("");
      const res = await sendViaResend({
        to: [SUPPORT_INBOX],
        ...(data.email ? { reply_to: data.email } : {}),
        subject: `[Puntr form] ${data.form}${data.name ? ` from ${data.name}` : ""}`,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111;"><h2 style="margin:0 0 12px;">New ${esc(data.form)} submission</h2><table>${rows}</table>${data.message ? `<p style="white-space:pre-wrap;">${esc(data.message)}</p>` : ""}</div>`,
        text: `New ${data.form} submission\nName: ${data.name ?? "-"}\nEmail: ${data.email ?? "-"}\n\n${data.message ?? ""}`,
      });
      if (res.ok) await db.from("form_submissions").update({ emailed: true }).eq("id", row.id);
      else console.error(`form email failed [${res.status}]`);
    } catch (e) {
      console.error("form email threw", e);
    }
    return { ok: true };
  });
