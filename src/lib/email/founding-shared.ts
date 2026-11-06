/** Shared pieces of the Founding Member emails: the real Puntr logo in header and footer, and the Annual Pass offer terms. */
import { SITE } from "../launch";

export const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The real logo, served from the website (white-background friendly: dark wordmark, green dot). */
export const LOGO_URL = `${SITE}/puntrlogo.png`;

/** Limited offer terms. Keep in step with claim_annual_pass() in the database. */
export const PASS_SPOTS = 20;
export const PASS_DEADLINE_TEXT = "16 November 2026";
export const PASS_CLAIM_URL = `${SITE}/founding#annual-pass`;

export const RG_LINE =
  "18+ only. T&Cs apply. National Responsible Gambling Programme helpline: 0800 006 008.";

export function logoHeader(): string {
  return `<tr><td align="center" style="padding:28px 28px 16px;background:#ffffff;border-bottom:3px solid #16a34a;">
        <a href="${SITE}" target="_blank"><img src="${LOGO_URL}" width="132" height="56" alt="Puntr" style="display:block;border:0;height:56px;width:132px;" /></a>
        <div style="margin-top:6px;font-size:12px;color:#4b5563;">Predict smarter. Prove it.</div>
      </td></tr>`;
}

export function logoFooter(unsubscribeUrl: string, reason: string): string {
  return `<tr><td style="padding:20px 28px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.7;color:#6b7280;">
        <a href="${SITE}" target="_blank"><img src="${LOGO_URL}" width="84" height="36" alt="Puntr" style="display:block;border:0;height:36px;width:84px;margin-bottom:10px;" /></a>
        ${esc(reason)}<br />
        <a href="${esc(unsubscribeUrl)}" style="color:#4b5563;">Unsubscribe</a> &middot; <a href="${SITE}/privacy" style="color:#4b5563;">Privacy notice</a><br />
        ${esc(RG_LINE)}<br />Puntr - South Africa &middot; support@puntr.co.za &middot; puntr.co.za
      </td></tr>`;
}
