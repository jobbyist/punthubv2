/** Shared pieces of the Founding Member emails: the real Puntr logo in header and footer, and the Annual Pass offer terms. */
import { SITE } from "../launch";
import { DARK_CSS, themedLogo } from "./theme";

export { DARK_CSS };

export const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Limited offer terms. Keep in step with claim_annual_pass() in the database. */
export const PASS_SPOTS = 20;
export const PASS_DEADLINE_TEXT = "16 November 2026";
/** Claiming includes payment. Keep in step with /founding and the Terms. */
export const PASS_PAYMENT_TEXT =
  "Reserving is free on Puntr. We email you a secure PayFast payment link; complete the R299 payment within 48 hours or the reservation expires and the place is released.";
export const PASS_CLAIM_URL = `${SITE}/founding#annual-pass`;

export const RG_LINE =
  "18+ only. T&Cs apply. National Responsible Gambling Programme helpline: 0800 006 008.";

export function logoHeader(): string {
  return `<tr><td align="center" class="dm-card" style="padding:24px 28px 16px;background:#ffffff;border-bottom:3px solid #16a34a;">
        ${themedLogo(104, 56)}
        <div class="dm-sub" style="margin-top:6px;font-size:12px;color:#4b5563;">Predict smarter. Prove it.</div>
      </td></tr>`;
}

export function logoFooter(unsubscribeUrl: string, reason: string): string {
  return `<tr><td class="dm-sub dm-line" style="padding:20px 28px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        <div style="margin-bottom:10px;">${themedLogo(78, 42)}</div>
        ${esc(reason)}<br />
        <a class="dm-link" href="${esc(unsubscribeUrl)}" style="color:#4b5563;">Unsubscribe</a> &middot; <a class="dm-link" href="${SITE}/privacy" style="color:#4b5563;">Privacy notice</a><br />
        ${esc(RG_LINE)}<br />Puntr - South Africa &middot; support@puntr.co.za &middot; puntr.co.za
      </td></tr>`;
}

/* ------------------------------------------------------------------------------------------------------------
 * Shared builder for the Founding Member sequence. One layout, light and dark, real Puntr logo in header and
 * footer, plain-text twin generated from the same content. Relative imports only.
 * ------------------------------------------------------------------------------------------------------------ */

export const LAUNCH_TEXT = "Tuesday 1 December 2026";

/** Tag our own links so traffic from each email is visible in analytics. No personal data in the URL. */
export function tracked(path: string, campaign: string): string {
  const url = new URL(path.startsWith("http") ? path : `${SITE}${path}`);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "lifecycle");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export interface EmailBullet {
  title?: string;
  body: string;
}

export interface BuiltEmailInput {
  subject: string;
  preheader: string;
  heading: string;
  /** Greeting line, for example "Hi Thandi,". */
  greeting: string;
  paragraphs: string[];
  bullets?: EmailBullet[];
  /** Small boxed note (offer terms and the like). */
  panel?: { title: string; lines: string[]; link?: { label: string; url: string } };
  /** One-time code shown large above the button (sign-in, confirmation and reset emails). */
  code?: string;
  cta?: { label: string; url: string };
  afterCta?: string[];
  sign?: [string, string];
  /** Marketing emails carry an unsubscribe link; transactional ones leave it out. */
  unsubscribeUrl?: string;
  reason: string;
}

export function buildEmail(i: BuiltEmailInput): { subject: string; html: string; text: string } {
  const p = (t: string, extra = "") =>
    `<p class="dm-p" style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;${extra}">${esc(t)}</p>`;
  const bullets = (i.bullets ?? [])
    .map(
      (b) => `<tr><td style="padding:10px 0 10px 12px;border-left:3px solid #16a34a;">
            ${b.title ? `<div class="dm-h" style="font-size:14px;font-weight:700;color:#0d0d0d;">${esc(b.title)}</div>` : ""}
            <div class="dm-sub" style="${b.title ? "margin-top:2px;" : ""}font-size:14px;line-height:1.6;color:#4b5563;">${esc(b.body)}</div>
          </td></tr><tr><td style="height:6px;line-height:6px;">&nbsp;</td></tr>`,
    )
    .join("");
  const panel = i.panel
    ? `<table role="presentation" class="dm-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid #e5e7eb;background:#f8fafc;"><tr><td style="padding:16px 18px;">
          <div class="dm-h" style="font-size:13px;font-weight:700;color:#0d0d0d;">${esc(i.panel.title)}</div>
          ${i.panel.lines.map((l) => `<div class="dm-sub" style="margin-top:6px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(l)}</div>`).join("")}
          ${i.panel.link ? `<div style="margin-top:12px;"><a class="dm-green" href="${esc(i.panel.link.url)}" style="display:inline-block;border:1px solid #16a34a;color:#16a34a;text-decoration:none;font-weight:700;font-size:13px;padding:9px 16px;">${esc(i.panel.link.label)}</a></div>` : ""}
        </td></tr></table>`
    : "";
  const code = i.code
    ? `<table role="presentation" class="dm-box" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border:1px solid #e5e7eb;background:#f8fafc;"><tr><td style="padding:14px 22px;">
          <div class="dm-sub" style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4b5563;">Your code</div>
          <div class="dm-h" style="margin-top:4px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#0d0d0d;">${esc(i.code)}</div>
        </td></tr></table>`
    : "";
  const cta = i.cta
    ? `<p style="margin:4px 0 20px;"><a href="${esc(i.cta.url)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">${esc(i.cta.label)}</a></p>`
    : "";
  const sign = i.sign
    ? `<p class="dm-h" style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#0d0d0d;"><strong>${esc(i.sign[0])}</strong><br /><span class="dm-sub" style="color:#4b5563;">${esc(i.sign[1])}</span></p>`
    : "";
  const footer = i.unsubscribeUrl
    ? logoFooter(i.unsubscribeUrl, i.reason)
    : `<tr><td class="dm-sub dm-line" style="padding:20px 28px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        <div style="margin-bottom:10px;">${themedLogo(78, 42)}</div>
        ${esc(i.reason)}<br />
        <a class="dm-link" href="${SITE}/privacy" style="color:#4b5563;">Privacy notice</a><br />
        ${esc(RG_LINE)}<br />Puntr - South Africa &middot; support@puntr.co.za &middot; puntr.co.za
      </td></tr>`;

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><style>${DARK_CSS}</style><title>${esc(i.subject)}</title></head>
<body class="dm-outer" style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(i.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="dm-card" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      ${logoHeader()}
      <tr><td style="padding:24px 28px 0;">
        <h1 class="dm-h" style="margin:0 0 14px;font-size:22px;line-height:1.3;">${esc(i.heading)}</h1>
        ${p(i.greeting, "margin-bottom:10px;")}
        ${i.paragraphs.map((t) => p(t)).join("\n        ")}
        ${bullets ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;">${bullets}</table>` : ""}
        ${panel}
        ${code}
        ${cta}
        ${(i.afterCta ?? []).map((t) => p(t, "font-size:13px;color:#4b5563;")).join("\n        ")}
        ${sign}
      </td></tr>
      ${footer}
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    i.heading,
    "",
    i.greeting,
    "",
    ...i.paragraphs.flatMap((t) => [t, ""]),
    ...(i.bullets ?? []).map((b) => `- ${b.title ? `${b.title}: ` : ""}${b.body}`),
    ...(i.bullets?.length ? [""] : []),
    ...(i.panel
      ? [
          i.panel.title.toUpperCase(),
          ...i.panel.lines,
          ...(i.panel.link ? [`${i.panel.link.label}: ${i.panel.link.url}`] : []),
          "",
        ]
      : []),
    ...(i.code ? [`Your code: ${i.code}`, ""] : []),
    ...(i.cta ? [`${i.cta.label}: ${i.cta.url}`, ""] : []),
    ...(i.afterCta ?? []).flatMap((t) => [t, ""]),
    ...(i.sign ? [i.sign.join(", "), ""] : []),
    i.reason,
    ...(i.unsubscribeUrl ? [`Unsubscribe: ${i.unsubscribeUrl}`] : []),
    `Privacy notice: ${SITE}/privacy`,
    "",
    RG_LINE,
    "Puntr - South Africa | support@puntr.co.za | puntr.co.za",
  ].join("\n");

  return { subject: i.subject, html, text };
}
