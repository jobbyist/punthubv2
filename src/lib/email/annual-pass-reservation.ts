/**
 * Transactional email sent after a member reserves a Founding Annual Pass.
 * This is operational email, not a marketing campaign; it has no marketing unsubscribe footer.
 */
import { firstName } from "../launch";
import { buildEmail } from "./founding-shared";

export const ANNUAL_PASS_RESERVATION_SUBJECT =
  "Your Puntr Annual Pass is reserved: pay within 48 hours";

export interface AnnualPassReservationEmailInput {
  name: string;
  paymentUrl: string;
  holdExpiresAt: string;
}

export function renderAnnualPassReservationEmail({
  name,
  paymentUrl,
  holdExpiresAt,
}: AnnualPassReservationEmailInput) {
  const first = firstName(name);
  const deadline = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(holdExpiresAt));
  return buildEmail({
    subject: ANNUAL_PASS_RESERVATION_SUBJECT,
    preheader: "Your 12-month Puntr Pro Annual Pass is reserved. Pay R299 within 48 hours.",
    heading: "Your Annual Pass is reserved",
    greeting: first ? `Hi ${first},` : "Hi,",
    paragraphs: [
      "We have reserved one of the 20 Founding Annual Passes for you. No payment was taken on Puntr.",
      "To keep it, pay R299 once-off through the secure PayFast link below within 48 hours.",
      `Payment deadline: ${deadline} (South African time). If payment is not completed by then, the reservation expires and the place is released.`,
    ],
    cta: { label: "Pay R299 securely with PayFast", url: paymentUrl },
    afterCta: [
      "Your pass gives you 12 months of Puntr Pro from 1 December 2026. It is a once-off payment and does not renew automatically.",
      "Already paid, or need help? Reply to this email or contact support@puntr.co.za.",
    ],
    reason: "This is a service email about the Annual Pass you reserved on Puntr.",
  });
}
