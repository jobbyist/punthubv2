import { renderWelcomeEmail, welcomeSubject } from "./email/templates/early-access-welcome";

import { REPLY_TO, SENDER, SUPPORT_INBOX, sendViaResend } from "./email/resend.server";

export { REPLY_TO, SENDER, SUPPORT_INBOX };

export interface WelcomeEmailInput {
  name: string;
  email: string;
  plan: string;
  phone?: string | undefined;
}

export { renderWelcomeEmail };

/** Internal alert so the team sees every signup in the support inbox. */
export async function notifySupport(input: WelcomeEmailInput): Promise<void> {
  try {
    const rows = [
      ["Name", input.name],
      ["Email", input.email],
      ["Phone", input.phone || "—"],
      ["Plan", input.plan],
    ]
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#4B5563;">${k}</td><td style="padding:4px 0;font-weight:700;color:#111111;">${v}</td></tr>`,
      )
      .join("");

    const result = await sendViaResend({
      to: [SUPPORT_INBOX],
      reply_to: input.email,
      subject: `New Early Access signup — ${input.name} (${input.plan})`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#111111;"><h2 style="margin:0 0 12px;">New Early Access signup</h2><table>${rows}</table></div>`,
    });

    if (!result.ok) {
      console.error(`Support notification failed [${result.status}]: ${result.body}`);
    }
  } catch (error) {
    console.error("Support notification threw:", error);
  }
}

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  // Always alert the support inbox, regardless of the member email outcome.
  const notify = notifySupport(input);

  try {
    const result = await sendViaResend({
      to: [input.email],
      reply_to: REPLY_TO,
      subject: welcomeSubject,
      html: renderWelcomeEmail({ name: input.name, plan: input.plan }),
    });

    await notify;

    if (!result.ok) {
      console.error(`Resend send failed [${result.status}]: ${result.body}`);
      return {
        sent: false,
        reason: result.status === 0 ? "EMAIL_NOT_CONFIGURED" : `EMAIL_FAILED_${result.status}`,
      };
    }

    return { sent: true };
  } catch (error) {
    console.error("Resend send threw:", error);
    await notify;
    return { sent: false, reason: "EMAIL_NETWORK_ERROR" };
  }
}
