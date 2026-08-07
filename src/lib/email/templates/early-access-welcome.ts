import { brand, button, card, divider, escapeHtml, footer, heading, layout, logoHeader, paragraph } from "./components";

export interface WelcomeEmailProps {
  name: string;
  plan?: string;
}

export const welcomeSubject = "🏆 You're officially on the Puntr Early Access List";
export const welcomePreview = "You're one step closer to smarter sports betting. Here's what happens next.";

const perks = [
  "Priority beta access",
  "Exclusive feature previews",
  "Product updates",
  "Early member rewards",
  "Opportunities to shape the platform with your feedback",
];

const nextUp = [
  "We'll keep you updated with occasional progress emails.",
  "You'll get behind-the-scenes previews.",
  "You'll be among the first invited into the beta.",
];

export function renderWelcomeEmail({ name, plan }: WelcomeEmailProps): string {
  const firstName = escapeHtml(name.split(" ")[0] || "there");

  const perkRows = perks
    .map(
      (p) =>
        `<tr><td style="padding:5px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:${brand.text};">✅&nbsp; ${escapeHtml(p)}</td></tr>`,
    )
    .join("");

  const nextRows = nextUp
    .map(
      (p) =>
        `<tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${brand.muted};">•&nbsp; ${escapeHtml(p)}</td></tr>`,
    )
    .join("");

  const planRow = plan
    ? card(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:14px;color:${brand.muted};">Plan reserved</td>
          <td align="right" style="font-size:14px;font-weight:800;color:${brand.green};">${escapeHtml(plan)}</td>
        </tr></table>`,
      )
    : "";

  const body = `
    ${logoHeader()}
    <tr>
      <td class="px" style="padding:16px 32px 8px;">
        ${heading("Welcome to Puntr 🎉")}
        ${paragraph(`Hi ${firstName},`)}
        ${paragraph("Thanks for joining the Puntr Early Access community.")}
        ${paragraph(
          "You're officially on the waitlist for a new generation of sports betting technology built to help South African bettors make smarter, more informed decisions.",
        )}
        ${paragraph(
          "We're building more than another betting app. Puntr combines AI-powered insights, real-time data, bookmaker comparisons, educational content and responsible gambling tools into one premium platform.",
        )}
        ${planRow}
        <p style="margin:24px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${brand.text};">As an Early Access member you'll receive:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${perkRows}</table>

        ${divider()}

        <h2 style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:19px;color:${brand.text};font-weight:800;">What happens next?</h2>
        ${paragraph("While we're putting the finishing touches on Puntr:")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${nextRows}</table>
        <p style="margin:14px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${brand.muted};">No spam. Only meaningful updates.</p>
      </td>
    </tr>
    <tr>
      <td class="px" align="center" style="padding:28px 32px 8px;">
        <span class="btn" style="display:inline-block;margin:0 6px 10px;">${button("Follow Puntr on X", brand.x, "primary")}</span>
        <span class="btn" style="display:inline-block;margin:0 6px 10px;">${button("Visit Puntr", brand.site, "secondary")}</span>
      </td>
    </tr>
    <tr>
      <td class="px" style="padding:16px 32px 28px;">
        ${card(
          `<div style="font-size:16px;font-weight:800;color:${brand.text};">Help us build South Africa's smartest betting community.</div>
           <div style="margin-top:8px;font-size:14px;line-height:1.6;color:${brand.muted};">Invite your friends to join the Early Access list and stay tuned for referral rewards coming soon.</div>`,
          "#F0FDF4",
        )}
      </td>
    </tr>
    ${footer()}
  `;

  return layout(body, welcomePreview);
}
