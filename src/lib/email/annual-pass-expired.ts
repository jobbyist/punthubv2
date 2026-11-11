/**
 * Transactional email sent once, after an unpaid Founding Annual Pass reservation has expired and the place has
 * been released. A service email about a reservation the member made themselves, so it carries no marketing
 * unsubscribe link. English only, relative imports only. No urgency tricks beyond the real deadline, no profit claims.
 */
import { firstName } from "../launch";
import {
  buildEmail,
  PASS_CLAIM_URL,
  PASS_DEADLINE_TEXT,
  PASS_SPOTS,
  PASS_PAYMENT_TEXT,
} from "./founding-shared";

export interface AnnualPassExpiredEmailInput {
  name: string;
  /** When the lapsed hold ended. */
  holdExpiredAt: string;
  /** True while the Annual Pass offer is still open (before the offer deadline). Decided by the sender at send time. */
  offerOpen: boolean;
}

/** The offer closes at the end of 16 November 2026, South African time. Keep in step with claim_annual_pass(). */
export const ANNUAL_PASS_OFFER_END = "2026-11-16T23:59:59+02:00";

export function isOfferOpen(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(ANNUAL_PASS_OFFER_END).getTime();
}

const za = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", ...opts }).format(
    new Date(iso),
  );

export function renderAnnualPassExpiredEmail({
  name,
  holdExpiredAt,
  offerOpen,
}: AnnualPassExpiredEmailInput) {
  const first = firstName(name);
  const when = za(holdExpiredAt, { dateStyle: "long", timeStyle: "short" });
  const greeting = first ? `Hi ${first},` : "Hi,";
  const reason = "This is a service email about the Annual Pass you reserved on Puntr.";

  if (offerOpen) {
    return buildEmail({
      subject: "Your Puntr Annual Pass reservation has expired: you can reserve again",
      preheader: `The Founding Annual Pass offer is open until ${PASS_DEADLINE_TEXT}.`,
      heading: "Your Annual Pass reservation has expired",
      greeting,
      paragraphs: [
        `Your reservation for a Founding Annual Pass expired on ${when} (South African time) because the R299 payment was not completed within the 48-hour window. No payment was taken and nothing is owing. The place went back to the other Founding Members.`,
        `If you still want one, you can reserve again. The offer is open until ${PASS_DEADLINE_TEXT}, while places last, with ${PASS_SPOTS} Founding Annual Passes in total.`,
      ],
      panel: {
        title: "If you reserve again",
        lines: [
          PASS_PAYMENT_TEXT,
          "Amount: R299 once-off, paid on PayFast. No payment is taken on Puntr.",
          "Includes: 12 months of Puntr Pro from 1 December 2026. It does not renew automatically.",
        ],
      },
      cta: { label: "Reserve my Annual Pass again", url: PASS_CLAIM_URL },
      afterCta: [
        "Not for you? No action needed. Your Founding Member place and number are not affected.",
        "Questions, or a payment problem on your side? Reply to this email or write to support@puntr.co.za and we will help.",
      ],
      sign: ["Michael", "Founder, Puntr"],
      reason,
    });
  }

  return buildEmail({
    subject: "Your Puntr Annual Pass reservation has expired",
    preheader:
      "The Founding Annual Pass offer has now closed. Your Founding Member place is unaffected.",
    heading: "Your Annual Pass reservation has expired",
    greeting,
    paragraphs: [
      `Your reservation for a Founding Annual Pass expired on ${when} (South African time) because the R299 payment was not completed within the 48-hour window. No payment was taken and nothing is owing.`,
      `The Founding Annual Pass offer closed on ${PASS_DEADLINE_TEXT}, so it can no longer be reserved. Your Founding Member place and number are not affected.`,
      "Puntr Pro and Pay-As-You-Go credits are planned for the official launch on 1 December 2026. We will tell you here and on puntr.co.za when they are available.",
    ],
    cta: { label: "See what opens at launch", url: "https://puntr.co.za/roadmap" },
    afterCta: [
      "Questions? Reply to this email or write to support@puntr.co.za and a person will read it.",
    ],
    sign: ["Michael", "Founder, Puntr"],
    reason,
  });
}
