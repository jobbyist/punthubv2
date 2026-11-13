/**
 * Branded Supabase Auth emails (sign-up confirmation, passwordless sign-in, password reset, email change, invite,
 * re-authentication and security notices). Sent by the Send Email Hook route `/api/auth/send-email` through Resend
 * from "Puntr - South Africa <support@puntr.co.za>". Relative imports only so tests and scripts can load it.
 *
 * Links go to `/auth/confirm` on puntr.co.za with the token hash; that page asks the member to tap "Continue" before
 * it verifies, so link scanners in mail systems cannot use up the link. The 6-digit code works as an alternative.
 */
import { SITE } from "../launch";
import { buildEmail } from "./founding-shared";

export type AuthEmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | "password_changed_notification"
  | "email_changed_notification"
  | "phone_changed_notification"
  | "identity_linked_notification"
  | "identity_unlinked_notification"
  | "mfa_factor_enrolled_notification"
  | "mfa_factor_unenrolled_notification";

export interface AuthEmailInput {
  action: AuthEmailAction;
  /** Address this message goes to. */
  to: string;
  /** 6-digit code, when the action has one. */
  code?: string;
  /** Token hash for the link, when the action has one. */
  tokenHash?: string;
  /** Verify type passed to /auth/confirm (differs from the action for email changes). */
  verifyType?: string;
  /** Allowed path to continue to after confirming (already validated). */
  next?: string;
  /** For email changes: the other address involved. */
  otherEmail?: string;
  /** For email changes: is this the message to the new address? */
  toNewAddress?: boolean;
  /** For security notices: provider or factor name, if given. */
  detail?: string;
}

export interface AuthEmail {
  subject: string;
  html: string;
  text: string;
}

const EXPIRY = "The link and code work once and expire in 1 hour.";
const NOT_YOU =
  "Didn't ask for this? You can ignore this email; nothing changes on your account unless the link or code is used.";
const SIGN: [string, string] = ["The Puntr team", "Puntr - South Africa"];

/** Pages the confirm screen may send a member on to after verifying. Anything else falls back to the default. */
const ALLOWED_NEXT =
  /^\/(join|account(\/[a-z-]+)?|reset-password|founding|practice|wallet|rewards|onboarding)(\?[\w=&%-]*)?$/;

export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  let path = value;
  try {
    const u = new URL(value, SITE);
    const host = u.hostname;
    const ours =
      host === "puntr.co.za" ||
      host === "www.puntr.co.za" ||
      host === "localhost" ||
      host.endsWith(".vercel.app");
    if (!ours) return fallback;
    path = `${u.pathname}${u.search}`;
  } catch {
    return fallback;
  }
  return ALLOWED_NEXT.test(path) ? path : fallback;
}

export function confirmUrl(tokenHash: string, type: string, next: string): string {
  const u = new URL("/auth/confirm", SITE);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  u.searchParams.set("next", next);
  return u.toString();
}

function securityNotice(subject: string, heading: string, what: string, to: string): AuthEmail {
  return buildEmail({
    subject,
    preheader: what,
    heading,
    greeting: "Hi there,",
    paragraphs: [
      what,
      "If this was you, there's nothing else to do.",
      "If it wasn't you, reset your password straight away and reply to this email so we can help secure your account.",
    ],
    cta: { label: "Reset my password", url: `${SITE}/reset-password` },
    sign: SIGN,
    reason: `Security notice sent to ${to} for your Puntr account. These are sent for every change to how you sign in.`,
  });
}

export function buildAuthEmail(i: AuthEmailInput): AuthEmail {
  const reason = `Sent to ${i.to} because this was requested on puntr.co.za.`;
  const link = (type: string, next: string) =>
    i.tokenHash ? confirmUrl(i.tokenHash, type, safeNext(i.next, next)) : `${SITE}${next}`;
  const code = i.code && /^\d{6}$/.test(i.code) ? i.code : undefined;

  switch (i.action) {
    case "signup":
      return buildEmail({
        subject: "Confirm your email to finish joining Puntr",
        preheader: code ? `Your confirmation code is ${code}.` : "One tap to confirm your email.",
        heading: "Confirm your email",
        greeting: "Welcome to Puntr,",
        paragraphs: [
          "Confirm this email address to finish creating your account and keep your Founding Member place.",
          ...(code ? ["Enter the code on the sign-up screen, or tap the button."] : []),
        ],
        ...(code ? { code } : {}),
        cta: { label: "Confirm my email", url: link("signup", "/join") },
        afterCta: [EXPIRY, NOT_YOU],
        sign: SIGN,
        reason,
      });
    case "magiclink":
    case "email":
      return buildEmail({
        subject: code ? `${code} is your Puntr sign-in code` : "Your Puntr sign-in link",
        preheader: "Sign in to Puntr without a password.",
        heading: "Sign in to Puntr",
        greeting: "Hi there,",
        paragraphs: [
          code
            ? "Use this code on the sign-in screen, or tap the button to sign in on this device."
            : "Tap the button to sign in on this device.",
        ],
        ...(code ? { code } : {}),
        cta: {
          label: "Sign in to Puntr",
          url: link(i.action === "email" ? "email" : "magiclink", "/join"),
        },
        afterCta: [
          EXPIRY,
          NOT_YOU,
          "Puntr will never ask you for this code by phone, WhatsApp or DM.",
        ],
        sign: SIGN,
        reason,
      });
    case "recovery":
      return buildEmail({
        subject: "Reset your Puntr password",
        preheader: "Choose a new password for your Puntr account.",
        heading: "Reset your password",
        greeting: "Hi there,",
        paragraphs: [
          "We received a request to reset the password for your Puntr account.",
          ...(code
            ? ["Enter the code on the reset screen, or tap the button to choose a new password."]
            : ["Tap the button to choose a new password."]),
        ],
        ...(code ? { code } : {}),
        cta: { label: "Choose a new password", url: link("recovery", "/reset-password") },
        afterCta: [
          EXPIRY,
          "Didn't ask for this? Ignore this email; your password stays the same. If you keep getting these, reply and let us know.",
        ],
        sign: SIGN,
        reason,
      });
    case "invite":
      return buildEmail({
        subject: "You're invited to Puntr",
        preheader: "Accept your invitation to join Puntr.",
        heading: "You're invited to Puntr",
        greeting: "Hi there,",
        paragraphs: [
          "You've been invited to join Puntr, South Africa's community sports prediction platform. Predict smarter. Prove it.",
          "Accept the invitation to create your account. You must be 18 or older to join.",
        ],
        cta: { label: "Accept invitation", url: link("invite", "/join") },
        afterCta: ["This invitation link works once and expires in 24 hours.", NOT_YOU],
        sign: SIGN,
        reason,
      });
    case "email_change":
      return i.toNewAddress
        ? buildEmail({
            subject: "Confirm your new email for Puntr",
            preheader: "Confirm this address to finish changing your Puntr email.",
            heading: "Confirm your new email",
            greeting: "Hi there,",
            paragraphs: [
              `You asked to change your Puntr email${i.otherEmail ? ` from ${i.otherEmail}` : ""} to this address. Confirm it to finish the change.`,
            ],
            ...(code ? { code } : {}),
            cta: {
              label: "Confirm new email",
              url: link(i.verifyType ?? "email_change", "/account/security"),
            },
            afterCta: [EXPIRY, NOT_YOU],
            sign: SIGN,
            reason,
          })
        : buildEmail({
            subject: "Confirm your Puntr email change",
            preheader: "Someone asked to change the email on your Puntr account.",
            heading: "Confirm your email change",
            greeting: "Hi there,",
            paragraphs: [
              `You asked to change your Puntr email${i.otherEmail ? ` to ${i.otherEmail}` : ""}. Confirm from this address too so we know it's really you.`,
            ],
            ...(code ? { code } : {}),
            cta: {
              label: "Confirm the change",
              url: link(i.verifyType ?? "email_change", "/account/security"),
            },
            afterCta: [
              EXPIRY,
              "Didn't ask for this? Don't tap the button. Reset your password and reply to this email.",
            ],
            sign: SIGN,
            reason,
          });
    case "reauthentication":
      return buildEmail({
        subject: code ? `${code} is your Puntr verification code` : "Your Puntr verification code",
        preheader: "Confirm it's you to continue.",
        heading: "Confirm it's you",
        greeting: "Hi there,",
        paragraphs: ["Enter this code in Puntr to confirm a sensitive change to your account."],
        ...(code ? { code } : {}),
        afterCta: ["The code works once and expires soon.", NOT_YOU],
        sign: SIGN,
        reason,
      });
    case "password_changed_notification":
      return securityNotice(
        "Your Puntr password was changed",
        "Password changed",
        "The password for your Puntr account was just changed.",
        i.to,
      );
    case "email_changed_notification":
      return securityNotice(
        "Your Puntr email was changed",
        "Email address changed",
        `The email address on your Puntr account was changed${i.otherEmail ? ` (previously ${i.otherEmail})` : ""}.`,
        i.to,
      );
    case "phone_changed_notification":
      return securityNotice(
        "Your Puntr phone number was changed",
        "Phone number changed",
        "The phone number on your Puntr account was changed.",
        i.to,
      );
    case "identity_linked_notification":
      return securityNotice(
        "A sign-in method was added to your Puntr account",
        "New sign-in method",
        `A new way to sign in${i.detail ? ` (${i.detail})` : ""} was linked to your Puntr account.`,
        i.to,
      );
    case "identity_unlinked_notification":
      return securityNotice(
        "A sign-in method was removed from your Puntr account",
        "Sign-in method removed",
        `A sign-in method${i.detail ? ` (${i.detail})` : ""} was removed from your Puntr account.`,
        i.to,
      );
    case "mfa_factor_enrolled_notification":
      return securityNotice(
        "Two-step verification is on for your Puntr account",
        "Two-step verification added",
        "An authenticator app was added to your Puntr account. You'll be asked for a code from it when you sign in.",
        i.to,
      );
    case "mfa_factor_unenrolled_notification":
      return securityNotice(
        "Two-step verification was removed from your Puntr account",
        "Two-step verification removed",
        "An authenticator app was removed from your Puntr account.",
        i.to,
      );
  }
}

export const AUTH_EMAIL_ACTIONS: readonly AuthEmailAction[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
  "reauthentication",
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
];
