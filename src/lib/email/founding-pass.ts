/**
 * The Founding Member campaign email: the Annual Pass offer. English only, relative imports only.
 * Marketing email: sent only to people who opted in. Nothing here implies profit or a guaranteed result.
 */
import { firstName } from "../launch";
import {
  buildEmail,
  LAUNCH_TEXT,
  PASS_DEADLINE_TEXT,
  PASS_PAYMENT_TEXT,
  PASS_SPOTS,
  tracked,
} from "./founding-shared";

export const FOUNDING_CAMPAIGN = "founding-pass-1";

export interface FoundingPassInput {
  name: string;
  isMember: boolean;
  unsubscribeUrl: string;
}

export const FOUNDING_PASS_SUBJECT = "Founding Members: 12 months of Puntr Pro for R299";

export function renderFoundingPassEmail({ name, isMember, unsubscribeUrl }: FoundingPassInput) {
  const first = firstName(name);
  return buildEmail({
    subject: FOUNDING_PASS_SUBJECT,
    preheader: `Once-off R299. Reserve before ${PASS_DEADLINE_TEXT}. Starts on launch day, no auto-renewal.`,
    heading: "12 months of Puntr Pro for R299",
    greeting: first ? `Hi ${first},` : "Hi,",
    paragraphs: [
      isMember
        ? `Thank you for getting in early. Puntr launches on ${LAUNCH_TEXT}, and the Founding Annual Pass is open to the first ${PASS_SPOTS} founding members who reserve it before ${PASS_DEADLINE_TEXT}.`
        : `Founding Member sign-ups are open, and Puntr launches on ${LAUNCH_TEXT}. Get in early, become a founding member and you can reserve one of the first ${PASS_SPOTS} Annual Passes before ${PASS_DEADLINE_TEXT}.`,
      "It is a prepaid membership for the Puntr platform and tools. It is not an investment and it does not change how predictions are graded.",
    ],
    bullets: [
      { body: "12 months of Puntr Pro for a once-off R299" },
      { body: "Standard Puntr Pro is R99 a month (R1,188 a year), so you save R889" },
      { body: "Your 12 months start on launch day, 1 December 2026" },
      { body: "One payment. It does not renew automatically" },
    ],
    panel: {
      title: "How reserving works",
      lines: [
        "1. Reserve your pass. It is free to reserve and no payment is taken on Puntr.",
        "2. We email you a secure PayFast payment link.",
        "3. Pay the R299 within 48 hours. If you do not, the reservation expires and the place is released.",
        PASS_PAYMENT_TEXT,
      ],
    },
    cta: isMember
      ? { label: "Reserve my Annual Pass", url: tracked("/founding#annual-pass", "founding-pass") }
      : { label: "Claim my Founding spot", url: tracked("/join", "founding-pass") },
    afterCta: [
      "Not for you? No problem. Ignore this email and keep your free Founding membership.",
    ],
    unsubscribeUrl,
    reason:
      "You are getting this because you opted in to updates from Puntr. Unsubscribe at any time.",
  });
}
