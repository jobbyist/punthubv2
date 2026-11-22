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
  /** Allowed path to continue to after confirming (already va¶»§q«^