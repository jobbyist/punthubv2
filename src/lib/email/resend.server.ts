/**
 * The Resend sender used by every transactional email. Kept free of template and i18n imports so scripts
 * (for example scripts/invite-waitlist.ts) can use it under Bun.
 *
 * Transport: direct to the Resend API with RESEND_API_KEY (Vercel). When LOVABLE_API_KEY is also set, the
 * Lovable connector gateway is used instead (Lovable-hosted preview). From: "Puntr - South Africa
 * <support@puntr.co.za>", overridable with RESEND_FROM. If Resend rejects that sender because the domain is
 * not verified yet, the send is retried once from the older verified community sender.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const RESEND_URL = "https://api.resend.com/emails";

/** Single inbox that receives every reply and internal notification, and the main sender. */
export const SUPPORT_INBOX = "support@puntr.co.za";
export const SENDER = `Puntr - South Africa <${SUPPORT_INBOX}>`;
/** Earlier verified sender, used only as a fallback. */
export const FALLBACK_SENDER = "Puntr Community <hello@community.puntr.co.za>";
export const REPLY_TO = SUPPORT_INBOX;

async function post(payload: Record<string, unknown>) {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const resendApiKey = process.env["RESEND_API_KEY"];
  if (!resendApiKey) return { ok: false as const, status: 0, body: "EMAIL_NOT_CONFIGURED" };
  const viaGateway = Boolean(lovableApiKey);
  const response = await fetch(viaGateway ? `${GATEWAY_URL}/emails` : RESEND_URL, {
    method: "POST",
    headers: viaGateway
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": resendApiKey,
        }
      : { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return { ok: false as const, status: response.status, body: await response.text() };
  }
  return { ok: true as const, status: response.status, body: "" };
}

/** Body returned when Puntr's own email cap is reached. Batch senders stop their run when they see it. */
export const EMAIL_QUOTA_REACHED = "EMAIL_QUOTA_REACHED";

export function isEmailQuotaStop(res: { status: number; body: string }): boolean {
  return res.status === 429 && res.body === EMAIL_QUOTA_REACHED;
}

/**
 * Every email the app sends claims one unit of the `resend` quota first (Resend's free plan: 100 a day, 3,000 a
 * month; Puntr caps itself lower to leave room for sign-in emails). A refused claim sends nothing.
 */
export async function sendViaResend(payload: Record<string, unknown>) {
  if (!process.env["RESEND_API_KEY"])
    return { ok: false as const, status: 0, body: "EMAIL_NOT_CONFIGURED" };
  const { createQuotaClaim } = await import("@/lib/quota.server");
  if (!(await (await createQuotaClaim())("resend"))) {
    console.warn("resend: Puntr's daily or monthly email cap is reached; nothing sent");
    return { ok: false as const, status: 429, body: EMAIL_QUOTA_REACHED };
  }
  const from = process.env["RESEND_FROM"] || SENDER;
  const first = await post({ from, ...payload });
  const domainProblem =
    !first.ok && (first.status === 403 || first.status === 422) && /verif|domain/i.test(first.body);
  if (domainProblem && from !== FALLBACK_SENDER) {
    console.warn("resend: sender domain not verified, retrying from the fallback sender");
    return post({ from: FALLBACK_SENDER, ...payload });
  }
  return first;
}

/**
 * Sign-in, confirmation and password-reset emails from the Supabase Auth hook. They are never held back by Puntr's
 * own cap (a member must always be able to sign in), but each one still claims a unit of the `resend` quota when
 * there is room, so the marketing and service senders see the real usage and stop earlier.
 */
export async function sendAuthViaResend(payload: Record<string, unknown>) {
  if (!process.env["RESEND_API_KEY"])
    return { ok: false as const, status: 0, body: "EMAIL_NOT_CONFIGURED" };
  try {
    const { createQuotaClaim } = await import("@/lib/quota.server");
    await (
      await createQuotaClaim()
    )("resend");
  } catch (error) {
    console.warn("resend: quota claim for an auth email failed; sending anyway", error);
  }
  const from = process.env["RESEND_FROM"] || SENDER;
  const first = await post({ from, ...payload });
  const domainProblem =
    !first.ok && (first.status === 403 || first.status === 422) && /verif|domain/i.test(first.body);
  if (domainProblem && from !== FALLBACK_SENDER) {
    console.warn(
      "resend: sender domain not verified, retrying auth email from the fallback sender",
    );
    return post({ from: FALLBACK_SENDER, ...payload });
  }
  return first;
}
