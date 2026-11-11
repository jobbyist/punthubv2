/**
 * Transactional reminder sent once, before an unpaid Founding Annual Pass reservation lapses.
 * Operational email about a reservation the member made themselves, so it carries no marketing unsubscribe link.
 * English only, relative imports only. No urgency tricks beyond the real deadline, no profit claims.
 */
import { firstName } from "../launch";
import { buildEmail } from "./founding-shared";

export interface AnnualPassReminderEmailInput {
  name: string;
  /** Fresh signed Puntr redirect to the PayFast hosted link (same mechanism as the reservation email). */
  paymentUrl: string;
  holdExpiresAt: string;
  /** Send time, used for the "hours left" line. */
  now?: Date;
}

const za = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", ...opts }).format(
    new Date(iso),
  );

/** "about 14 hours", "about 1 hour", "under an hour". Rounds to whole hours, never negative. */
export function hoursLeftText(holdExpiresAt: string, now: Date = new Date()): string {
  const ms = new Date(holdExpiresAt).getTime() - now.getTime();
  const hours = Math.round(ms / 3_600_000);
  if (ms <= 0 || hours < 1) return "under an hour";
  return hours === 1 ? "about 1 hour" : `about ${hours} hours`;
}

export function renderAnnualPassReminderEmail({
  name,
  paymentUrl,
  holdExpiresAt,
  now = new Date(),
}: AnnualPassReminderEmailInput) {
  const first = firstName(name);
  const short = za(holdExpiresAt, { weekday: "short", day: "numeric", month: "short" });
  const time = za(holdExpiresAt, { hour: "2-digit", minute: "2-digit", hour12: false });
  const full = za(holdExpiresAt, { dateStyle: "long", timeStyle: "short" });
  const left = hoursLeftText(holdExpiresAt, now);
  return buildEmail({
    subject: `Reminder: your Puntr Annual Pass is held until ${short}, ${time}`,
    preheader: `Your place is held for ${left}. Pay R299 to keep it.`,
    heading: "Your Annual Pass place is still held",
    greeting: first ? `Hi ${first},` : "Hi,",
    paragraphs: [
      `You reserved one of the 20 Founding Annual Passes and the payment window closes in ${left}.`,
      "To keep your place, pay R299 once-off through the secure PayFast link below. If it is not paid by the deadline, the reservation expires and the place goes back to the other Founding Members.",
    ],
    panel: {
      title: "Your reservation",
      lines: [
        `Pay by: ${full} (South African time)`,
        "Amount: R299 once-off, paid on PayFast. No payment is taken on Puntr.",
        "Includes: 12 months of Puntr Pro from 1 December 2026. It does not renew automatically.",
      ],
    },
    cta: { label: "Pay R299 securely with PayFast", url: paymentUrl },
    afterCta: [
      "Already paid? Thank you. Payments can take a short while to show, so you can ignore this reminder.",
      "Changed your mind, or need help? Reply to this email or write to support@puntr.co.za and we will sort it out.",
    ],
    sign: ["Michael", "Founder, Puntr"],
    reason: "This is a service email about the Annual Pass you reserved on Puntr.",
  });
}
