/**
 * The launch emails to early-access people who have not signed up yet (waves 1 to 3), and the reminder to the
 * admin. English only. Relative imports only. Nothing here implies profit; the perks are the ones on /pricing.
 */
import { firstName, SITE, type Wave } from "../launch";

export interface LaunchEmailInput {
  wave: Wave;
  name: string;
  unsubscribeUrl: string;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const COPY: Record<
  Wave,
  { subject: string; preheader: string; title: string; lead: string; cta: string; closing?: string }
> = {
  1: {
    subject: "Puntr is live: your Founding spot is reserved",
    preheader: "Join free with this email address to claim your numbered Founding badge.",
    title: "Puntr is live",
    lead: "You asked for early access, and today Puntr opens. Your Founding Member spot is reserved for you.",
    cta: "Claim my Founding spot",
  },
  2: {
    subject: "Your Puntr Founding spot is still reserved",
    preheader: "It takes about a minute to join, and it is free.",
    title: "Your Founding spot is still waiting",
    lead: "Puntr opened a few days ago and we are still holding your Founding Member spot.",
    cta: "Join Puntr free",
  },
  3: {
    subject: "Last note about your Puntr Founding spot",
    preheader: "This is the last email we will send about it.",
    title: "One last reminder",
    lead: "Your Founding Member spot is still reserved. This is the last email we will send you about it.",
    cta: "Join Puntr free",
    closing:
      "If Puntr is not for you, no problem. Use the unsubscribe link below and you will not hear from us.",
  },
};

const PERKS = [
  "A permanent Founding badge, numbered #1 to #100",
  "Full access to posting, your record and the weekly leaderboard",
  "30 free Pay-As-You-Go credits a month for 3 months once they launch",
];

export function renderLaunchEmail({ wave, name, unsubscribeUrl }: LaunchEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const c = COPY[wave];
  const hi = firstName(name) ? `Hi ${firstName(name)},` : "Hi,";
  const join = `${SITE}/join`;
  const privacy = `${SITE}/privacy`;
  const how =
    "Join with the same email address you gave us and your Founding number is assigned when you finish setting up your profile.";
  const reason =
    "You are getting this because you asked for early access to Puntr. Unsubscribe at any time and we will stop.";
  const rg =
    "18+ only. Gamble responsibly. National Responsible Gambling Programme helpline: 0800 006 008.";

  const text = [
    c.title,
    "",
    hi,
    c.lead,
    "",
    "As a Founding Member you get:",
    ...PERKS.map((p) => `- ${p}`),
    "",
    how,
    `${c.cta}: ${join}`,
    c.closing ?? "",
    "",
    reason,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Privacy notice: ${privacy}`,
    "",
    rg,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:28px 28px 8px;">
        <div style="font-size:26px;font-weight:800;letter-spacing:-1px;">puntr<span style="color:#16a34a;">.</span></div>
        <div style="margin-top:2px;font-size:12px;color:#6b7280;">Predict smarter. Prove it.</div>
      </td></tr>
      <tr><td style="padding:8px 28px 0;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${esc(c.title)}</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">${esc(hi)}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${esc(c.lead)}</p>
        <p style="margin:0 0 6px;font-size:14px;font-weight:700;">As a Founding Member you get:</p>
        <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#374151;">
          ${PERKS.map((p) => `<li>${esc(p)}</li>`).join("\n          ")}
        </ul>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">${esc(how)}</p>
        <p style="margin:0 0 20px;"><a href="${esc(join)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">${esc(c.cta)}</a></p>
        ${c.closing ? `<p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(c.closing)}</p>` : ""}
        <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(reason)}</p>
      </td></tr>
      <tr><td style="padding:16px 28px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        <a href="${esc(unsubscribeUrl)}" style="color:#4b5563;">Unsubscribe</a> &middot; <a href="${esc(privacy)}" style="color:#4b5563;">Privacy notice</a><br />
        ${esc(rg)}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject: c.subject, html, text };
}

export interface AdminReminderInput {
  whatsapp: string;
  sms: string;
  adminUrl: string;
}

/** Sent to the admin on launch day: the message to send to every early-access person by WhatsApp and SMS. */
export function renderAdminReminder({ whatsapp, sms, adminUrl }: AdminReminderInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Puntr is live: send the launch message on WhatsApp and SMS";
  const text = [
    "Launch day reminder",
    "",
    "The launch emails go out this morning. Please also send the message below by WhatsApp and SMS to the early-access list.",
    `The list, with one-tap WhatsApp and SMS links, is in the admin panel: ${adminUrl}`,
    "",
    "WhatsApp:",
    whatsapp,
    "",
    "SMS:",
    sms,
    "",
    "Check each person's marketing consent column first. Email-only for anyone who did not tick it.",
  ].join("\n");
  const block = (t: string) =>
    `<p style="margin:0 0 16px;padding:12px;background:#f3f4f6;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(t)}</p>`;
  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:28px;">
        <div style="font-size:26px;font-weight:800;letter-spacing:-1px;">puntr<span style="color:#16a34a;">.</span></div>
        <h1 style="margin:16px 0 12px;font-size:20px;">Launch day reminder</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">The launch emails go out this morning. Please also send the message below by WhatsApp and SMS to the early-access list. The list, with one-tap links, is in the admin panel.</p>
        <p style="margin:0 0 20px;"><a href="${esc(adminUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;">Open the admin panel</a></p>
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;">WhatsApp</p>${block(whatsapp)}
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;">SMS</p>${block(sms)}
        <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">Check each person's marketing consent column first. Email only for anyone who did not tick it.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject, html, text };
}
