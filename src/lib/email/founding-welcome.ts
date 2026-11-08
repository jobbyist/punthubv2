/**
 * Founding Member welcome email (email 1 of the sequence): a personal note from the Founder, what Puntr is, and a
 * quiet Annual Pass offer for the first 20 founding members. Marketing email (opted-in members only). Nothing here
 * implies profit or a guaranteed result. English only, relative imports only.
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

export const FOUNDING_WELCOME_SUBJECT = "Welcome to Puntr, Founding Member";

export interface FoundingWelcomeInput {
  name: string;
  unsubscribeUrl: string;
}

export function renderFoundingWelcomeEmail({ name, unsubscribeUrl }: FoundingWelcomeInput) {
  const first = firstName(name);
  return buildEmail({
    subject: FOUNDING_WELCOME_SUBJECT,
    preheader: `Predict what's next. Prove your worth. Puntr launches on ${LAUNCH_TEXT}.`,
    heading: "Welcome to Puntr, Founding Member",
    greeting: first ? `Hi ${first},` : "Hi,",
    paragraphs: [
      "Thank you for getting in early. You confirmed your email and your place is saved, which means you are one of the first people on Puntr.",
      "I started Puntr because South African tipsters deserve a place where a good record speaks for itself: every pick locked before kick-off, graded the same way for everyone, and visible to the whole community. No hype. Just proof.",
      `We launch officially on ${LAUNCH_TEXT}, starting with football. Here is what you are part of:`,
    ],
    bullets: [
      {
        title: "Predictions you can prove",
        body: "Post your pick before kick-off. It is locked, time-stamped and graded fairly, so your record is real.",
      },
      {
        title: "Leaderboards",
        body: "Weekly and all-time rankings built on settled picks. Climb on the strength of your record.",
      },
      {
        title: "PuntPoints and Rewards",
        body: "Earn PuntPoints for taking part and redeem them for vouchers, sponsored rewards and perks. Never cash.",
      },
      {
        title: "Insights and tools",
        body: "Form, head-to-head and context in plain language. Insights inform your thinking. They do not predict outcomes for you.",
      },
      {
        title: "Refer and earn bonus PuntPoints, coming soon",
        body: "Soon you will be able to share your referral link and earn up to 30% in bonus PuntPoints on qualifying purchases made by the people you invite. Details to follow.",
      },
    ],
    cta: { label: "Set up my profile", url: tracked("/account", "founding-welcome") },
    afterCta: [
      "Reply to this email any time with ideas, questions or anything that does not feel right. It comes straight to me and the team.",
    ],
    sign: ["Michael", "Founder, Puntr"],
    panel: {
      title: "A quiet offer for our first 20",
      lines: [
        `Reserve 12 months of Puntr Pro for a once-off R299 (standard Pro is R99 a month). Open to the first ${PASS_SPOTS} founding members who reserve before ${PASS_DEADLINE_TEXT}. Your 12 months start on launch day and do not renew automatically.`,
        PASS_PAYMENT_TEXT,
      ],
      link: {
        label: "Reserve my Annual Pass",
        url: tracked("/founding#annual-pass", "founding-welcome"),
      },
    },
    unsubscribeUrl,
    reason:
      "You are getting this because you joined Puntr as a Founding Member and opted in to updates.",
  });
}
