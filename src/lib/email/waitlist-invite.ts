/**
 * The waitlist notice. English only, one service email. No imports from the shared email components, so the
 * invite script can run under Bun.
 */
import { SITE } from "../waitlist";

export const waitlistSubject = "Your Puntr early-access spot is open";

export interface WaitlistInviteInput {
  spotsLeft: number | null;
  cap: number;
  unsubscribeUrl: string;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderWaitlistInvite({ spotsLeft, cap, unsubscribeUrl }: WaitlistInviteInput): {
  subject: string;
  html: string;
  text: string;
} {
  const join = `${SITE}/join`;
  const privacy = `${SITE}/privacy`;
  const spots =
    spotsLeft === null
      ? null
      : spotsLeft > 0
        ? `${spotsLeft} of ${cap} Founding spots are left.`
        : "The Founding spots are now full, but you can still join as a member.";
  const reason =
    "You are getting this one email because you asked for early access to Puntr on our waitlist. We will not email you again unless you tell us you want updates.";

  const text = [
    "Your Puntr early-access spot is open",
    "",
    "Puntr is where South African sports fans post picks that are locked at kick-off, graded automatically and kept on a public record.",
    spots ?? "",
    "",
    `Join here: ${join}`,
    "",
    reason,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Privacy notice: ${privacy}`,
    "",
    "18+ only. Gamble responsibly. National Responsible Gambling Programme helpline: 0800 006 008.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(waitlistSubject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:28px 28px 8px;">
        <div style="font-size:26px;font-weight:800;letter-spacing:-1px;">puntr<span style="color:#16a34a;">.</span></div>
      </td></tr>
      <tr><td style="padding:8px 28px 0;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Your Puntr early-access spot is open</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Puntr is where South African sports fans post picks that are locked at kick-off, graded automatically and kept on a public record.</p>
        ${spots ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;font-weight:700;color:#16a34a;">${esc(spots)}</p>` : ""}
        <p style="margin:0 0 20px;"><a href="${esc(join)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">Join Puntr</a></p>
        <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(reason)}</p>
      </td></tr>
      <tr><td style="padding:16px 28px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        <a href="${esc(unsubscribeUrl)}" style="color:#4b5563;">Unsubscribe</a> &middot; <a href="${esc(privacy)}" style="color:#4b5563;">Privacy notice</a><br />
        18+ only. Gamble responsibly. National Responsible Gambling Programme helpline: 0800 006 008.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject: waitlistSubject, html, text };
}
