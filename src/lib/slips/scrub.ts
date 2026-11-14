/**
 * Removes personal details from betting-slip text before it leaves the device or reaches an AI service (POPIA:
 * never send personal data to an AI service). Runs in the browser after OCR and again on the server, so a
 * modified client cannot skip it.
 *
 * Removed: email addresses, SA phone numbers, long digit runs (account, ID, card or ticket numbers of 8+ digits),
 * and whole lines that label personal or account details (name, username, account, balance, ID, mobile, ...).
 */

const LABEL_LINE =
  /\b(account|acc(?:t)?\s*no|balance|bal\b|wallet|name|surname|username|user\s*id|customer|client|member\s*(?:no|id)|id\s*(?:no|number)|identity|passport|mobile|cell(?:phone)?|phone|tel\b|e-?mail|address|voucher\s*code|pin\b|otp\b|password|card)/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// +27 or 0, then 9 digits, with optional spaces or dashes.
const SA_PHONE = /(?:\+27|\b0)(?:[\s-]?\d){9}\b/g;
const LONG_DIGITS = /\d(?:[\s-]?\d){7,}/g;

export interface ScrubResult {
  text: string;
  /** How many items or lines were removed, for the "we removed N personal details" notice. */
  removed: number;
}

export function scrubSlipText(input: string, maxChars = 4000): ScrubResult {
  let removed = 0;
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => {
      if (LABEL_LINE.test(line)) {
        removed += 1;
        return false;
      }
      return true;
    });
  let text = lines.join("\n");
  const sub = (re: RegExp) => {
    text = text.replace(re, () => {
      removed += 1;
      return "[removed]";
    });
  };
  sub(EMAIL);
  sub(SA_PHONE);
  sub(LONG_DIGITS);
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
  return { text, removed };
}
