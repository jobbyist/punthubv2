/**
 * Founding Member welcome email: a personal note from the Founder, what makes Puntr different, and a quiet
 * Annual Pass offer for the first 20 founding members to claim it before 16 November 2026.
 * Marketing email (sent only to opted-in members). Nothing here implies profit or a guaranteed result.
 * English only, relative imports only.
 */
import { firstName, SITE } from "../launch";
import {
  esc,
  logoFooter,
  logoHeader,
  DARK_CSS,
  PASS_CLAIM_URL,
  PASS_DEADLINE_TEXT,
  PASS_PAYMENT_TEXT,
  PASS_SPOTS,
  RG_LINE,
} from "./founding-shared";

export const FOUNDING_WELCOME_SUBJECT = "Welcome to Puntr, Founding Member";

export interface FoundingWelcomeInput {
  name: string;
  unsubscribeUrl: string;
}

const features: { title: string; body: string }[] = [
  {
    title: "Match predictions you can prove",
    body: "Post your pick before kick-off. It is locked, time-stamped and graded the same way for everyone, so your record is real.",
  },
  {
    title: "Leaderboards",
    body: "Weekly and all-time rankings built on settled picks. Climb on the strength of your record, not your volume.",
  },
  {
    title: "PuntPoints and Rewards",
    body: "Earn PuntPoints for taking part and redeem them for vouchers, sponsored rewards and perks. Never cash.",
  },
  {
    title: "AI-powered insights and tools",
    body: "Form, head-to-head and context in plain language, so you can analyse a match faster. Insights inform your thinking. They do not predict outcomes for you.",
  },
  {
    title: "Community",
    body: "Follow tipsters, compare your picks with the crowd and learn from people who show their working.",
  },
  {
    title: "Refer and earn bonus PuntPoints, coming soon",
    body: "Soon you will be able to share a unique referral link or code from your profile and earn up to 30% in bonus PuntPoints on qualifying purchases made by the people you invite. PuntPoints are redeemable for vouchers, sponsored rewards and perks, never cash. Details to follow.",
  },
];

export function renderFoundingWelcomeEmail({ name, unsubscribeUrl }: FoundingWelcomeInput) {
  const first = firstName(name);
  const hi = first ? `Hi ${first},` : "Hi,";
  const preheader =
    "A personal welcome from the Founder, and what to expect when Puntr launches on 1 December 2026.";
  const intro = [
    "Welcome to Puntr, and thank you for getting in early. You are one of the first people to join, and that matters to me.",
    "I started Puntr because South African tipsters deserve a place where a good record speaks for itself: every pick locked before kick-off, graded fairly, and visible to everyone. No hype. Just proof.",
    "We launch on Tuesday 1 December 2026, starting with football. Here is what you are part of:",
  ];
  const outro =
    "Your feedback shapes what we build next. Reply to this email any time with ideas, questions or things that do not feel right. It comes straight to me and the team.";
  const passTitle = "A quiet offer for our first 20";
  const passBody = `If you would like to reserve 12 months of Puntr Pro for a once-off R299 (standard Pro is R99 a month, R1,188 a year), the Founding Annual Pass is open to the first ${PASS_SPOTS} founding members who claim it before ${PASS_DEADLINE_TEXT}. Your 12 months start on launch day, 1 December 2026, and it does not renew automatically.`;
  const passNote = `${PASS_PAYMENT_TEXT} If you do not want it, simply ignore this section.`;
  const passCta = "Reserve my Annual Pass";
  const sign = ["Michael", "Founder, Puntr"];
  const reason =
    "You are getting this because you joined Puntr as a Founding Member and opted in to updates.";

  const text = [
    "Welcome to Puntr, Founding Member",
    "",
    hi,
    "",
    ...intro.flatMap((p) => [p, ""]),
    ...features.map((f) => `- ${f.title}: ${f.body}`),
    "",
    outro,
    "",
    sign.join(", "),
    "",
    passTitle.toUpperCase(),
    passBody,
    passNote,
    `${passCta}: ${PASS_CLAIM_URL}`,
    "",
    reason,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Privacy notice: ${SITE}/privacy`,
    "",
    RG_LINE,
    "Puntr - South Africa | support@puntr.co.za | puntr.co.za",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en-ZA"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light dark" /><meta name="supported-color-schemes" content="light dark" /><style>${DARK_CSS}</style><title>${esc(FOUNDING_WELCOME_SUBJECT)}</title></head>
<body class="dm-outer" style="margin:0;padding:24px 12px;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0d0d0d;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" class="dm-card" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">
      ${logoHeader()}
      <tr><td style="padding:24px 28px 0;">
        <h1 class="dm-h" style="margin:0 0 14px;font-size:22px;line-height:1.3;">Welcome to Puntr, Founding Member</h1>
        <p class="dm-p" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${esc(hi)}</p>
        ${intro.map((p) => `<p class="dm-p" style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${esc(p)}</p>`).join("\n        ")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px;">
          ${features
            .map(
              (f) => `<tr><td style="padding:10px 0 10px 12px;border-left:3px solid #16a34a;">
            <div class="dm-h" style="font-size:14px;font-weight:700;color:#0d0d0d;">${esc(f.title)}</div>
            <div class="dm-sub" style="margin-top:2px;font-size:14px;line-height:1.6;color:#4b5563;">${esc(f.body)}</div>
          </td></tr><tr><td style="height:6px;line-height:6px;">&nbsp;</td></tr>`,
            )
            .join("\n          ")}
        </table>
        <p class="dm-p" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${esc(outro)}</p>
        <p class="dm-h" style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#0d0d0d;"><strong>${esc(sign[0] ?? "")}</strong><br /><span class="dm-sub" style="color:#4b5563;">${esc(sign[1] ?? "")}</span></p>
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <table role="presentation" class="dm-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;background:#f8fafc;"><tr><td style="padding:16px 18px;">
          <div class="dm-h" style="font-size:13px;font-weight:700;color:#0d0d0d;">${esc(passTitle)}</div>
          <p class="dm-sub" style="margin:6px 0 8px;font-size:13px;line-height:1.6;color:#4b5563;">${esc(passBody)}</p>
          <p class="dm-sub" style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#6b7280;">${esc(passNote)}</p>
          <a class="dm-green" href="${esc(PASS_CLAIM_URL)}" style="display:inline-block;border:1px solid #16a34a;color:#16a34a;text-decoration:none;font-weight:700;font-size:13px;padding:9px 16px;">${esc(passCta)}</a>
        </td></tr></table>
      </td></tr>
      ${logoFooter(unsubscribeUrl, reason)}
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: FOUNDING_WELCOME_SUBJECT, html, text };
}
