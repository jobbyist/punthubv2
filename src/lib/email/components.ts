/**
 * Reusable, email-client-safe HTML building blocks (Gmail / Outlook friendly).
 * Pure presentation — no business logic, no secrets.
 */

export const brand = {
  green: "#16A34A",
  greenDark: "#0F7A36",
  text: "#111111",
  muted: "#4B5563",
  soft: "#F8FAFC",
  border: "#E5E7EB",
  white: "#FFFFFF",
  site: "https://punthubv2.lovable.app",
  x: "https://twitter.com/puntr_za",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Hidden preheader text shown as the inbox preview line. */
export function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">${escapeHtml(
    text,
  )}</div>`;
}

export function logoHeader(): string {
  return `<tr>
    <td align="center" style="padding:32px 24px 8px;">
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:30px;font-weight:800;letter-spacing:-1px;color:${brand.text};">Puntr<span style="color:${brand.green};">.</span></div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${brand.green};margin-top:6px;font-weight:700;">Early Access</div>
    </td>
  </tr>`;
}

export function button(label: string, href: string, variant: "primary" | "secondary" = "primary"): string {
  const isPrimary = variant === "primary";
  const bg = isPrimary ? brand.green : brand.white;
  const color = isPrimary ? brand.white : brand.text;
  const border = isPrimary ? brand.green : brand.border;
  return `<a href="${href}" target="_blank" style="display:inline-block;background-color:${bg};color:${color};border:1px solid ${border};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;padding:13px 26px;border-radius:10px;">${escapeHtml(
    label,
  )}</a>`;
}

export function card(innerHtml: string, background: string = brand.soft): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${background};border:1px solid ${brand.border};border-radius:14px;">
    <tr><td style="padding:20px 22px;font-family:Helvetica,Arial,sans-serif;">${innerHtml}</td></tr>
  </table>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.25;color:${brand.text};font-weight:800;">${text}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${brand.muted};">${html}</p>`;
}

export function divider(): string {
  return `<div style="height:1px;line-height:1px;background-color:${brand.border};margin:28px 0;">&nbsp;</div>`;
}

export function footer(): string {
  return `<tr>
    <td style="padding:24px 32px 32px;border-top:1px solid ${brand.border};font-family:Helvetica,Arial,sans-serif;">
      <div style="font-size:15px;font-weight:800;color:${brand.text};">Puntr</div>
      <div style="font-size:13px;color:${brand.muted};margin-top:2px;">Smarter Predictions. Better Decisions.</div>
      <div style="margin-top:16px;font-size:12px;line-height:1.7;color:#6B7280;">
        <strong style="color:${brand.text};">Responsible Gambling Reminder</strong><br />
        Puntr promotes responsible gambling. No prediction can guarantee winnings.<br />
        Never bet more than you can afford to lose. 18+ Only.<br />
        National Responsible Gambling Toll-Free Counselling Line: 0800 006 008.
      </div>
      <div style="margin-top:16px;font-size:11px;color:#9CA3AF;">&copy; 2026 Puntr. All Rights Reserved.</div>
    </td>
  </tr>`;
}

/** Wraps body rows in a responsive, dark-mode-aware document shell. */
export function layout(bodyRows: string, previewText: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Puntr</title>
    <style>
      @media only screen and (max-width:600px) {
        .container { width:100% !important; }
        .px { padding-left:20px !important; padding-right:20px !important; }
        .btn { display:block !important; margin-bottom:12px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .bg-outer { background-color:#0B0F0E !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${brand.soft};">
    ${preheader(previewText)}
    <table role="presentation" class="bg-outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.soft};padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${brand.white};border:1px solid ${brand.border};border-radius:18px;overflow:hidden;">
            ${bodyRows}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
