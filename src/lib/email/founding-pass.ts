/**
 * The Founding Member campaign email: the Annual Pass upsell. English only, relative imports only.
 * Marketing email: sent only to people who opted in. Nothing here implies profit or a guaranteed result.
 */
import { firstName, SITE } from "../launch";
import {
  DARK_CSS,
  esc,
  logoFooter,
  logoHeader,
  PASS_CLAIM_URL,
  PASS_DEADLINE_TEXT,
  PASS_PAYMENT_TEXT,
  PASS_SPOTS,
  RG_LINE,
} from "./founding-shared";

export const FOUNDING_CAMPAIGN = "founding-pass-1";

export interface FoundingPassInput {
  name: string;
  isMember: boolean;
  unsubscribeUrl: string;
}

export const FOUNDING_PASS_SUBJECT = "Founding Members: 12 months of Puntr Pro for R299";

export function renderFoundingPassEmail({ name, isMember, unsubscribeUrl }: FoundingPassInput) {
  const hi = firstName(name) ? `Hi ${firstName(name)},` : "Hi,";
  const preheader = "Once-off R299. Starts on launch day, 1 December 2026. No auto-renewal.";
  const lead = isMember
    ? "Thank you for getting in early. Founding Member sign-ups opened on 2 November and Puntr launches on Tuesday 1 December 2026. Predict what's next. Prove your worth."
    : "Founding Member sign-ups opened on 2 November and Puntr launches on Tuesday 1 December 2026. Your Founding spot is waiting. Get in early. Become a founding member. Be part of what's next.";
  const offer = [
    `Open to the first ${PASS_SPOTS} founding members who claim it before ${PASS_DEADLINE_TEXT}`,
    "12 months of Puntr Pro for a once-off R299",
    "Standard Puntr Pro is R99 a month (R1,188 a year), so you save R889",
    "Your 12 months start on launch day, 1 December 2026",
    "One payment. It does not renew automatically",
  ];
  const note =
    "The Annual Pass is a prepaid membership for the Puntr platform and tools. It is not an investment and it does not change how predictions are graded. " +
    PASS_PAYMENT_TEXT;
  const cta = isMember ? "Claim and pay R299" : "Claim my Founding spot";
  const link = isMember ? PASS_CLAIM_URL : `${SITE}/join`;
  const reason =
    "You are getting this because you opted in to updates from Puntr. Unsubscribe at any time.";
  const rg = RG_LINE;
  const privacy = `${SITE}/privacy`;

  const text = [
    "Founding Member Annual Pass",
    "",
    hi,
    lead,
    "",
    "The Founding Member Annual Pass:",
    ...offer.map((o) => `- ${o}`),
    "",
    note,
    `${cta}: ${link}`,
    "",
    reason,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Privacy notice: ${privacy}`,
    "",
    rg,
    "Puntr - South Africa | support@puntr.co.za | puntr.co.za",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><style>${DARK_CSS}</style><title>${esc(FOUNDING_PASS_SUBJECT)}</title></head>
<body class="dm-outer" style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="dm-card" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      ${logoHeader()}
      <tr><td style="padding:24px 28px 0;">
        <h1 class="dm-h" style="margin:0 0 12px;font-size:22px;line-height:1.3;">12 months of Puntr Pro for R299</h1>
        <p class="dm-p" style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">${esc(hi)}</p>
        <p class="dm-p" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${esc(lead)}</p>
        <p class="dm-h" style="margin:0 0 6px;font-size:14px;font-weight:700;">The Founding Member Annual Pass</p>
        <ul class="dm-p" style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#374151;">
          ${offer.map((o) => `<li>${esc(o)}</li>`).join("\n          ")}
        </ul>
        <p class="dm-sub" style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(note)}</p>
        <p style="margin:0 0 20px;"><a href="${esc(link)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">${esc(cta)}</a></p>
      </td></tr>
      ${logoFooter(unsubscribeUrl, reason)}
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: FOUNDING_PASS_SUBJECT, html, text };
}
