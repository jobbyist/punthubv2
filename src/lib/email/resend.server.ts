/**
 * The Resend sender used by every transactional email. Kept free of template and i18n imports so scripts
 * (for example scripts/invite-waitlist.ts) can use it under Bun.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

/** Verified Resend sender identity for all Early Access transactional email. */
export const SENDER = "Puntr Community <hello@community.puntr.co.za>";
/** Single inbox that receives every reply and internal notification. */
export const SUPPORT_INBOX = "support@puntr.co.za";
export const REPLY_TO = SUPPORT_INBOX;

export async function sendViaResend(payload: Record<string, unknown>) {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const resendApiKey = process.env["RESEND_API_KEY"];
  if (!lovableApiKey || !resendApiKey)
    return { ok: false as const, status: 0, body: "EMAIL_NOT_CONFIGURED" };

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": resendApiKey,
    },
    body: JSON.stringify({ from: process.env["RESEND_FROM"] || SENDER, ...payload }),
  });

  if (!response.ok) {
    return { ok: false as const, status: response.status, body: await response.text() };
  }
  return { ok: true as const, status: response.status, body: "" };
}
