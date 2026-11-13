/** Admin > Endorsements: organisations, status, Gemini drafts, and sending through Resend. */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildDraftRequest,
  checkDraft,
  ENDORSEMENT_KINDS,
  ENDORSEMENT_STATUSES,
  finalBody,
  SENDERS,
  toHtml,
  type EmailKind,
  type EndorsementEmail,
  type EndorsementEvent,
  type EndorsementKind,
  type EndorsementOrg,
  type EndorsementStatus,
  type SenderKey,
} from "@/lib/endorsements";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; message: string };
type Row = Record<string, unknown>;

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

const FORBIDDEN: Fail = { ok: false, message: "Admin only." };
const str = (v: unknown) => (typeof v === "string" ? v : "");

const toOrg = (r: Row): EndorsementOrg => ({
  id: str(r["id"]),
  name: str(r["name"]),
  kind: r["kind"] as EndorsementKind,
  jurisdiction: str(r["jurisdiction"]),
  website: (r["website"] as string | null) ?? null,
  contactName: str(r["contact_name"]),
  contactRole: str(r["contact_role"]),
  contactEmail: (r["contact_email"] as string | null) ?? null,
  status: r["status"] as EndorsementStatus,
  whatWeSeek: str(r["what_we_seek"]),
  reasons: str(r["reasons"]),
  notes: str(r["notes"]),
  doNotContact: r["do_not_contact"] === true,
  lastContactedAt: (r["last_contacted_at"] as string | null) ?? null,
  nextFollowUpAt: (r["next_follow_up_at"] as string | null) ?? null,
});
const toEmail = (r: Row): EndorsementEmail => ({
  id: str(r["id"]),
  orgId: str(r["org_id"]),
  kind: r["kind"] as EmailKind,
  sender: r["sender"] as SenderKey,
  subject: str(r["subject"]),
  body: str(r["body"]),
  status: r["status"] as EndorsementEmail["status"],
  model: (r["model"] as string | null) ?? null,
  toEmail: (r["to_email"] as string | null) ?? null,
  error: (r["error"] as string | null) ?? null,
  createdAt: str(r["created_at"]),
  sentAt: (r["sent_at"] as string | null) ?? null,
});
const toEvent = (r: Row): EndorsementEvent => ({
  id: str(r["id"]),
  orgId: str(r["org_id"]),
  kind: str(r["kind"]),
  detail: str(r["detail"]),
  createdAt: str(r["created_at"]),
});

async function event(
  db: SupabaseClient,
  adminId: string,
  orgId: string,
  kind: string,
  detail = "",
) {
  await db
    .from("endorsement_events")
    .insert({ org_id: orgId, admin_id: adminId, kind, detail: detail.slice(0, 1000) });
  await db.from("admin_actions").insert({
    admin_id: adminId,
    action: `endorsement.${kind}`,
    detail: { orgId, detail: detail.slice(0, 200) },
  });
}

export const adminEndorsementOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      orgs: EndorsementOrg[];
      emails: EndorsementEmail[];
      events: EndorsementEvent[];
    } | null> => {
      const db = await adminDb(context as Ctx);
      if (!db) return null;
      const [o, e, ev] = await Promise.all([
        db.from("endorsement_orgs").select("*").order("name"),
        db
          .from("endorsement_emails")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
        db
          .from("endorsement_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      return {
        orgs: ((o.data ?? []) as Row[]).map(toOrg),
        emails: ((e.data ?? []) as Row[]).map(toEmail),
        events: ((ev.data ?? []) as Row[]).map(toEvent),
      };
    },
  );

export interface SaveOrgInput {
  id?: string;
  name: string;
  kind: EndorsementKind;
  jurisdiction: string;
  website: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  status: EndorsementStatus;
  whatWeSeek: string;
  reasons: string;
  notes: string;
  doNotContact: boolean;
  nextFollowUpAt: string;
}

export const adminSaveEndorsementOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as SaveOrgInput)
  .handler(async ({ context, data }): Promise<{ ok: true; id: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    const name = data.name.trim();
    if (!name) return { ok: false, message: "Enter the organisation's name." };
    if (!ENDORSEMENT_KINDS.includes(data.kind) || !ENDORSEMENT_STATUSES.includes(data.status))
      return { ok: false, message: "Unknown kind or status." };
    const website = data.website.trim();
    if (website && !/^https:\/\/[^\s]+$/.test(website))
      return { ok: false, message: "The website must start with https://" };
    const email = data.contactEmail.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return { ok: false, message: "Check the contact email address." };
    const follow = data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null;
    if (follow && Number.isNaN(follow.getTime()))
      return { ok: false, message: "Check the follow-up date." };
    const row = {
      name,
      kind: data.kind,
      jurisdiction: data.jurisdiction.trim().slice(0, 120),
      website: website || null,
      contact_name: data.contactName.trim().slice(0, 120),
      contact_role: data.contactRole.trim().slice(0, 120),
      contact_email: email || null,
      status: data.status,
      what_we_seek: data.whatWeSeek.trim().slice(0, 600),
      reasons: data.reasons.trim().slice(0, 1500),
      notes: data.notes.trim().slice(0, 3000),
      do_not_contact: data.doNotContact,
      next_follow_up_at: follow ? follow.toISOString() : null,
    };
    if (data.id) {
      const { data: prev } = await db
        .from("endorsement_orgs")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      const { error } = await db.from("endorsement_orgs").update(row).eq("id", data.id);
      if (error) return { ok: false, message: error.message };
      const was = (prev as { status: string } | null)?.status;
      await event(
        db,
        ctx.userId,
        data.id,
        was && was !== data.status ? "status_change" : "updated",
        was && was !== data.status ? `${was} -> ${data.status}` : "",
      );
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await db
      .from("endorsement_orgs")
      .insert(row)
      .select("id")
      .single();
    if (error)
      return {
        ok: false,
        message:
          error.code === "23505" ? "That organisation is already on the list." : error.message,
      };
    const id = (ins as { id: string }).id;
    await event(db, ctx.userId, id, "created", name);
    return { ok: true, id };
  });

export const adminDraftEndorsementEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: unknown) => d as { orgId: string; kind: EmailKind; sender: SenderKey; extra: string },
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ ok: true; email: EndorsementEmail; warnings: string[] } | Fail> => {
      const ctx = context as Ctx;
      const db = await adminDb(ctx);
      if (!db) return FORBIDDEN;
      if (!(data.kind in { outreach: 1, follow_up: 1 }) || !(data.sender in SENDERS))
        return { ok: false, message: "Unknown email type or sender." };
      const { data: orgRow } = await db
        .from("endorsement_orgs")
        .select("*")
        .eq("id", data.orgId)
        .maybeSingle();
      if (!orgRow) return { ok: false, message: "Organisation not found." };
      const org = toOrg(orgRow as Row);
      const { data: prev } = await db
        .from("endorsement_emails")
        .select("subject")
        .eq("org_id", org.id)
        .eq("status", "sent");
      const previousSubjects = ((prev ?? []) as { subject: string }[]).map((p) => p.subject);

      const { readContentEnv } = await import("@/lib/content/config");
      const env = readContentEnv();
      if (!env.geminiKey) return { ok: false, message: "GEMINI_API_KEY is not set." };
      const { createGemini } = await import("@/lib/content/providers.server");
      const { createModelRouter } = await import("@/lib/content/model-router");
      const { createQuotaClaim, guardLlm } = await import("@/lib/quota.server");
      const router = createModelRouter(
        guardLlm(createGemini(env.geminiKey), await createQuotaClaim()),
        {
          models: env.models,
          dailyCap: env.dailyRequestCap,
        },
      );
      let text: string;
      let model: string;
      try {
        const r = await router.generate(
          buildDraftRequest(org, data.kind, data.sender, data.extra ?? "", previousSubjects),
        );
        text = r.text;
        model = r.model;
      } catch {
        return {
          ok: false,
          message:
            "Gemini could not draft this right now (daily limit or high demand). Try again later.",
        };
      }
      let subject = "";
      let body = "";
      try {
        const j = JSON.parse(text) as { subject?: unknown; body?: unknown };
        subject = str(j.subject).trim().slice(0, 200);
        body = str(j.body).trim().slice(0, 6000);
      } catch {
        return { ok: false, message: "Gemini returned an unreadable draft. Try again." };
      }
      if (!subject || !body)
        return { ok: false, message: "Gemini returned an empty draft. Try again." };
      const { data: ins, error } = await db
        .from("endorsement_emails")
        .insert({
          org_id: org.id,
          kind: data.kind,
          sender: data.sender,
          subject,
          body,
          model,
          created_by: ctx.userId,
        })
        .select("*")
        .single();
      if (error) return { ok: false, message: error.message };
      await event(db, ctx.userId, org.id, "email_drafted", `${data.kind} via ${model}`);
      if (org.status === "prospect")
        await db.from("endorsement_orgs").update({ status: "drafted" }).eq("id", org.id);
      return { ok: true, email: toEmail(ins as Row), warnings: checkDraft(subject, body) };
    },
  );

export const adminSaveEndorsementDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { id: string; subject: string; body: string; sender: SenderKey })
  .handler(async ({ context, data }): Promise<{ ok: true; warnings: string[] } | Fail> => {
    const db = await adminDb(context as Ctx);
    if (!db) return FORBIDDEN;
    const subject = data.subject.trim().slice(0, 200);
    const body = data.body.trim().slice(0, 6000);
    if (!subject || !body || !(data.sender in SENDERS))
      return { ok: false, message: "A subject, a body and a sender are needed." };
    const { error } = await db
      .from("endorsement_emails")
      .update({ subject, body, sender: data.sender })
      .eq("id", data.id)
      .eq("status", "draft");
    if (error) return { ok: false, message: error.message };
    return { ok: true, warnings: checkDraft(subject, body) };
  });

export const adminSendEndorsementEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    const { data: row } = await db
      .from("endorsement_emails")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false, message: "Draft not found." };
    const email = toEmail(row as Row);
    if (email.status !== "draft")
      return { ok: false, message: "This email has already been sent." };
    const { data: orgRow } = await db
      .from("endorsement_orgs")
      .select("*")
      .eq("id", email.orgId)
      .maybeSingle();
    const org = orgRow ? toOrg(orgRow as Row) : null;
    if (!org) return { ok: false, message: "Organisation not found." };
    if (org.doNotContact || org.status === "declined")
      return { ok: false, message: "This organisation is marked do not contact or has declined." };
    if (!org.contactEmail) return { ok: false, message: "Add a contact email first." };
    const problems = checkDraft(email.subject, email.body);
    if (problems.length)
      return { ok: false, message: `Fix the draft first: ${problems.join("; ")}` };
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await db
      .from("endorsement_emails")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("status", "sent")
      .gte("sent_at", since);
    if ((count ?? 0) > 0)
      return {
        ok: false,
        message: "An email already went to this organisation in the last 24 hours.",
      };

    // Claim the draft before sending so a double click cannot send twice.
    const { data: claimed } = await db
      .from("endorsement_emails")
      .update({ status: "sent", sent_at: new Date().toISOString(), to_email: org.contactEmail })
      .eq("id", email.id)
      .eq("status", "draft")
      .select("id");
    if (!claimed?.length) return { ok: false, message: "This email has already been sent." };

    const { sendViaResend } = await import("@/lib/email/resend.server");
    const sender = SENDERS[email.sender];
    const text = finalBody(email.body, org.contactName, email.sender);
    let res: { ok: boolean; status: number; body: string };
    try {
      res = await sendViaResend({
        from: sender.from,
        to: [org.contactEmail],
        reply_to: sender.address,
        subject: email.subject,
        text,
        html: toHtml(text),
      });
    } catch (error) {
      // A thrown network error must not leave the draft marked as sent.
      res = {
        ok: false,
        status: 0,
        body: error instanceof Error ? error.message : "network error",
      };
    }
    if (!res.ok) {
      await db
        .from("endorsement_emails")
        .update({
          status: "draft",
          sent_at: null,
          to_email: null,
          error: `${res.status} ${res.body}`.slice(0, 500),
        })
        .eq("id", email.id);
      return {
        ok: false,
        message:
          res.body === "EMAIL_QUOTA_REACHED"
            ? "Puntr's daily email cap is reached. Try again tomorrow."
            : `Resend refused the email (${res.status}). Check that ${sender.address} is a verified sender.`,
      };
    }
    const next = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    await db
      .from("endorsement_orgs")
      .update({
        last_contacted_at: new Date().toISOString(),
        next_follow_up_at: next,
        ...(org.status === "prospect" || org.status === "drafted" || org.status === "follow_up_due"
          ? { status: "contacted" }
          : {}),
      })
      .eq("id", org.id);
    await event(db, ctx.userId, org.id, "email_sent", `${email.kind} from ${email.sender}`);
    return { ok: true };
  });

export const adminDeleteEndorsementDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    const db = await adminDb(context as Ctx);
    if (!db) return FORBIDDEN;
    const { error } = await db
      .from("endorsement_emails")
      .delete()
      .eq("id", data.id)
      .eq("status", "draft");
    return error ? { ok: false, message: error.message } : { ok: true };
  });
