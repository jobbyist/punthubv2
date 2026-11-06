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
