/**
 * Transactional email sent after a member reserves a Founding Annual Pass.
 * This is operational email, not a marketing campaign; it has no marketing unsubscribe footer.
 */
import { firstName, SITE } from "../launch";
import { DARK_CSS, esc, logoHeader, RG_LINE } from "./founding-shared";

export const ANNUAL_PASS_RESERVATION_SUBJECT =
  "Your Puntr Annual Pass is reserved — payment due within 48 hours";

export interface AnnualPassReservationEmailInput {
  name: string;
  paymentUrl: string;
  holdExpiresAt: string;
}

export function renderAnnualPassReservationEmail({
  name,
  paymentUrl,
  holdExpiresAt,
}: AnnualPassReservationEmailInput) {
  const first = firstName(name);
  const greeting = first ? `Hi ${first},` : "Hi,";
  const deadline = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(holdExpiresAt));
  const subject = ANNUAL_PASS_RESERVATION_SUBJECT;
  const text = [
    "Your Puntr Founding Annual Pass is reserved.",
    "",
    greeting,
    "We have reserved one of the 20 Founding Annual Passes for you. No payment was taken on Puntr.",
    "Your next step is to pay R299 using the secure PayFast link below within 48 hours.",
    `Payment deadline: ${deadline} (South African time).`,
    "If payment is not completed by then, your reservation expires and the place is released.",
    "",
    `Pay securely with PayFast: ${paymentUrl}`,
    "",
    "The pass gives you 12 months of Puntr Pro from 1 December 2026. It is a once-off payment and does not renew automatically.",
    "If you have already paid or need help, reply to this email or contact support@puntr.co.za.",
    "",
    "18+ only. Gamble responsibly: 0800 006 008.",
    `Puntr - South Africa | ${SITE}`,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><style>${DARK_CSS}</style><title>${esc(subject)}</title></head>
<body class="dm-outer" style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">Your 12-month Puntr Pro Annual Pass is reserved. Pay R299 within 48 hours.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="dm-card" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      ${logoHeader()}
      <tr><td style="padding:24px 28px 8px;">
        <h1 class="dm-h" style="margin:0 0 14px;font-size:22px;line-height:1.3;">Your Annual Pass is reserved</h1>
        <p class="dm-p" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${esc(greeting)}</p>
        <p class="dm-p" style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">We have reserved one of the 20 Founding Annual Passes for you. No payment was taken on Puntr.</p>
        <p class="dm-p" style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">Pay <strong>R299 once-off</strong> using the secure PayFast link below within 48 hours.</p>
        <p class="dm-p" style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151;"><strong>Payment deadline:</strong> ${esc(deadline)} SAST. If payment is not completed by then, your reservation expires and the place is released.</p>
        <p style="margin:0 0 20px;"><a href="${esc(paymentUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">Pay R299 securely with PayFast</a></p>
        <p class="dm-sub" style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#4b5563;">Your pass gives you 12 months of Puntr Pro from 1 December 2026. It is a once-off payment and does not renew automatically.</p>
        <p class="dm-sub" style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#4b5563;">If you have already paid or need help, reply to this email or contact <a href="mailto:support@puntr.co.za">support@puntr.co.za</a>.</p>
      </td></tr>
      <tr><td class="dm-sub" style="padding:18px 28px 24px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        ${esc(RG_LINE)}<br />Puntr - South Africa &middot; support@puntr.co.za &middot; <a href="${SITE}/privacy">Privacy notice</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject, html, text };
}
