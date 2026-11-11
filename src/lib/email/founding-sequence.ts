/**
 * The rest of the Founding Member sequence: checklist, survey, referral and launch countdown. English only,
 * relative imports only. Marketing email: opted-in members only, one send per address per campaign.
 * Nothing here implies profit or a guaranteed result, and PuntPoints are never cash.
 */
import { firstName } from "../launch";
import { buildEmail, LAUNCH_TEXT, tracked } from "./founding-shared";

export interface SequenceInput {
  name: string;
  unsubscribeUrl: string;
  /** Send time, used by the countdown. */
  now?: Date;
  /** Held Founding Member number, used by the early-access claim email. */
  foundingNumber?: number | undefined;
}

type Mail = { subject: string; html: string; text: string };

const hi = (name: string) => (firstName(name) ? `Hi ${firstName(name)},` : "Hi,");
const MARKETING_REASON =
  "You are getting this because you joined Puntr as a Founding Member and opted in to updates.";

/** Whole days from the send date to launch day, counted on the South African calendar. */
export function daysToLaunch(now: Date, launchIso = "2026-12-01"): number {
  const sast = new Date(now.getTime() + 2 * 3600_000).toISOString().slice(0, 10);
  const ms = Date.parse(`${launchIso}T00:00:00Z`) - Date.parse(`${sast}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export const CLAIM_CAMPAIGN = "founding-claim-1";
export function renderClaimEmail({ name, unsubscribeUrl, foundingNumber }: SequenceInput): Mail {
  const label = foundingNumber
    ? `Founding Member #${foundingNumber}`
    : "your Founding Member number";
  return buildEmail({
    subject: foundingNumber
      ? `Founding Member #${foundingNumber} is held for you: create your Puntr account`
      : "Your Founding Member number is held: create your Puntr account",
    preheader: "You joined early access. Create your account to claim your numbered badge.",
    heading: foundingNumber ? `Your number: #${foundingNumber}` : "Your number is held",
    greeting: hi(name),
    paragraphs: [
      `Thank you for joining Puntr early access. ${label} is held for you, in the order you signed up.`,
      "Founding Members get a permanent numbered badge on their profile. To claim yours, create your account with this same email address and confirm it. It takes about two minutes.",
      `Puntr launches officially on ${LAUNCH_TEXT}. Set up now and you can post your first pick the moment it opens.`,
    ],
    panel: {
      title: "How to claim your number",
      lines: [
        "1. Tap the button below and create your account with this email address.",
        "2. Confirm your email from the message we send you.",
        "3. Your Founding Member number appears on your profile.",
      ],
    },
    cta: {
      label: foundingNumber ? `Claim #${foundingNumber}` : "Create my account",
      url: tracked("/join", CLAIM_CAMPAIGN),
    },
    afterCta: ["Puntr is for adults only. You must be 18 or older to create an account."],
    sign: ["Michael", "Founder, Puntr"],
    unsubscribeUrl,
    reason: "You are getting this because you joined Puntr early access and opted in to updates.",
  });
}

export const CHECKLIST_CAMPAIGN = "founding-checklist-1";
export function renderChecklistEmail({ name, unsubscribeUrl }: SequenceInput): Mail {
  return buildEmail({
    subject: "Your Puntr launch checklist: four quick things",
    preheader: "Get set up now so you can post your first pick on launch day.",
    heading: "Get launch-ready in four steps",
    greeting: hi(name),
    paragraphs: [
      `Puntr launches on ${LAUNCH_TEXT}. A few minutes now means you can post your first pick the moment it opens.`,
    ],
    bullets: [
      {
        title: "1. Finish your profile",
        body: "Pick your username and add a profile picture so the community knows who is behind the record.",
      },
      {
        title: "2. Turn on two-factor sign-in",
        body: "Protect your account and your record with an authenticator app. It takes about two minutes.",
      },
      {
        title: "3. Verify your identity",
        body: "Verification is needed before you can redeem PuntPoints. Founding Members submit an ID for a manual check, and we delete the document once the check is done.",
      },
      {
        title: "4. Tell us what to build first",
        body: "Our short Founding Member survey takes a couple of minutes and goes straight to the team.",
      },
    ],
    cta: { label: "Open my account", url: tracked("/account", CHECKLIST_CAMPAIGN) },
    afterCta: [
      "PuntPoints are a loyalty scheme for vouchers, sponsored rewards and perks. Never cash.",
    ],
    unsubscribeUrl,
    reason: MARKETING_REASON,
  });
}

export const SURVEY_CAMPAIGN = "founding-survey-1";
export function renderSurveyEmail({ name, unsubscribeUrl }: SequenceInput): Mail {
  return buildEmail({
    subject: "Help shape Puntr before launch (2 minutes)",
    preheader: "Tell us what matters most. Your answers go straight to the team.",
    heading: "Help us build the right Puntr",
    greeting: hi(name),
    paragraphs: [
      `You are one of the first people on Puntr, so your view carries real weight. With launch on ${LAUNCH_TEXT}, we are deciding what to polish and what to build next.`,
      "The Founding Member survey is a few short questions: what you expect from Puntr, which features you want first, and how you feel about pricing. It takes about two minutes and you can be as brief or as detailed as you like.",
    ],
    panel: {
      title: "What happens to your answers",
      lines: [
        "They go to the Puntr team at support@puntr.co.za and help us prioritise the launch roadmap.",
        "We only follow up with you if you tick the box to say we may contact you.",
      ],
    },
    cta: { label: "Take the Founding Member survey", url: tracked("/feedback", SURVEY_CAMPAIGN) },
    afterCta: ["Prefer to write to us instead? Reply to this email and a person will read it."],
    sign: ["Michael", "Founder, Puntr"],
    unsubscribeUrl,
    reason: MARKETING_REASON,
  });
}

export const REFERRAL_CAMPAIGN = "founding-referral-1";
export function renderReferralEmail({ name, unsubscribeUrl }: SequenceInput): Mail {
  return buildEmail({
    subject: "Bring your crew to Puntr: only 100 numbered Founding spots",
    preheader: "Share your link. Referral bonus PuntPoints are coming soon.",
    heading: "Know someone who loves a good prediction?",
    greeting: hi(name),
    paragraphs: [
      "Puntr is better when the people you debate football with are on it too. Founding Member sign-ups are open to the first 100 people, each with a permanent numbered badge.",
      "Your personal referral link is on your Refer a friend page. Share it with friends, family and your group chats.",
    ],
    panel: {
      title: "Refer and earn bonus PuntPoints: coming soon",
      lines: [
        "When referrals open you will be able to earn up to 30% in bonus PuntPoints on qualifying purchases made by the people you invite.",
        "PuntPoints are a loyalty scheme redeemable for vouchers, sponsored rewards and perks. Never cash. We will email you the full details before it opens.",
      ],
    },
    cta: { label: "Get my referral link", url: tracked("/referrals", REFERRAL_CAMPAIGN) },
    afterCta: ["Only invite people aged 18 or older. Puntr is for adults only."],
    unsubscribeUrl,
    reason: MARKETING_REASON,
  });
}

export const COUNTDOWN_CAMPAIGN = "founding-countdown-1";
export function renderCountdownEmail({
  name,
  unsubscribeUrl,
  now = new Date(),
}: SequenceInput): Mail {
  const days = daysToLaunch(now);
  const label = days === 1 ? "1 day" : `${days} days`;
  return buildEmail({
    subject: `${label} to Puntr: here is what opens on launch day`,
    preheader: `Predict what's next. Prove your worth. Launch is ${LAUNCH_TEXT}.`,
    heading: `${label} to launch`,
    greeting: hi(name),
    paragraphs: [
      `Puntr launches officially on ${LAUNCH_TEXT}. Here is what to expect, and where the rest of the roadmap goes next.`,
    ],
    bullets: [
      {
        title: "Football first",
        body: "Betway Premiership (PSL), the EPL, the UEFA Champions League and more leagues as they are switched on.",
      },
      {
        title: "Locked, time-stamped predictions",
        body: "Every pick is locked before kick-off and graded the same way for everyone.",
      },
      {
        title: "Leaderboards and PuntPoints",
        body: "Build a public record, climb the rankings and earn PuntPoints for vouchers, sponsored rewards and perks.",
      },
      {
        title: "More sports after launch",
        body: "Basketball and rugby follow in week two, with more sports on the public roadmap. Nothing is switched on until it works properly.",
      },
    ],
    cta: { label: "See the roadmap", url: tracked("/roadmap", COUNTDOWN_CAMPAIGN) },
    afterCta: ["Know someone who should be in the first 100? Send them to puntr.co.za/founding."],
    sign: ["Michael", "Founder, Puntr"],
    unsubscribeUrl,
    reason: MARKETING_REASON,
  });
}

export const PRACTICE_CAMPAIGN = "founding-practice-1";
/** Real sends stay off until Practice Mode is live (PRACTICE_MODE_ENABLED=true), so no email points at a page that is not there. */
export const PRACTICE_ENV_GATE = "PRACTICE_MODE_ENABLED";
export function renderPracticeEmail({ name, unsubscribeUrl }: SequenceInput): Mail {
  return buildEmail({
    subject: "Try Puntr in Practice Mode, then tell us what you think",
    preheader:
      "Practice picks on made-up fixtures. Share feedback for a chance at a R500 OTT voucher.",
    heading: "Try Puntr before launch day",
    greeting: hi(name),
    paragraphs: [
      "Practice Mode is open for Founding Members. It is a safe place to get a feel for Puntr: fixtures, results and teams are made up, so nothing here is a real match.",
      "Post practice picks, watch them settle, see where you land on the practice leaderboard and look through the demo rewards. It works the way the real thing will, with none of the real thing at stake.",
    ],
    bullets: [
      {
        title: "Made-up fixtures and results",
        body: "Fictional teams and leagues only. Practice picks never count towards your real record.",
      },
      {
        title: "Practice points and demo rewards",
        body: "Practice points are for Practice Mode only and cannot be turned into real PuntPoints. Demo rewards show how redeeming will feel and carry no real value.",
      },
      {
        title: "Then tell us what you think",
        body: "Our short feedback form takes a couple of minutes. What felt clear, what confused you, what is missing?",
      },
    ],
    panel: {
      title: "Feedback draw: a chance at a R500 OTT voucher",
      lines: [
        "Leave your feedback and tick the draw box to be entered into the draw for a R500 OTT voucher. Entering the draw is optional.",
        "One entry per member. 18+ only. T&Cs apply. The draw rules, closing date and how the winner is chosen and told will be published on the feedback page.",
      ],
      link: { label: "Give feedback", url: tracked("/feedback", PRACTICE_CAMPAIGN) },
    },
    cta: { label: "Open Practice Mode", url: tracked("/practice", PRACTICE_CAMPAIGN) },
    afterCta: [
      `Puntr launches officially on ${LAUNCH_TEXT}. Puntr is for adults only: you must be 18 or older.`,
    ],
    sign: ["Michael", "Founder, Puntr"],
    unsubscribeUrl,
    reason: MARKETING_REASON,
  });
}

/**
 * Campaigns the sequence runner can send, by id. Member-only ones need a Puntr account to make sense;
 * early-only ones go to early-access sign-ups who have not created an account yet.
 */
export const SEQUENCE: Record<
  string,
  {
    memberOnly: boolean;
    earlyOnly?: boolean;
    /** Env var that must be "true" before this campaign is sent to real recipients (test sends are always allowed). */
    requiresEnv?: string;
    render: (i: SequenceInput) => Mail;
  }
> = {
  [CLAIM_CAMPAIGN]: { memberOnly: false, earlyOnly: true, render: renderClaimEmail },
  [CHECKLIST_CAMPAIGN]: { memberOnly: true, render: renderChecklistEmail },
  [SURVEY_CAMPAIGN]: { memberOnly: true, render: renderSurveyEmail },
  [REFERRAL_CAMPAIGN]: { memberOnly: true, render: renderReferralEmail },
  [COUNTDOWN_CAMPAIGN]: { memberOnly: false, render: renderCountdownEmail },
  [PRACTICE_CAMPAIGN]: {
    memberOnly: true,
    requiresEnv: PRACTICE_ENV_GATE,
    render: renderPracticeEmail,
  },
};
