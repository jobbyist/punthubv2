import { renderWelcomeEmail, welcomeSubject } from "./email/templates/early-access-welcome";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

/** Verified Resend sender identity for all Early Access transactional email. */
export const SENDER = "Puntr Community <hello@community.puntr.co.za>";
export const REPLY_TO = "support@community.puntr.co.za";

export interface WelcomeEmailInput {
  name: string;
  email: string;
  plan: string;
}

export { renderWelcomeEmail };

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const resendApiKey = process.env["RESEND_API_KEY"];

  if (!lovableApiKey || !resendApiKey) {
    console.error("Resend credentials missing; skipping early-access welcome email.");
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: process.env["RESEND_FROM"] || SENDER,
        to: [input.email],
        reply_to: REPLY_TO,
        subject: welcomeSubject,
        html: renderWelcomeEmail({ name: input.name, plan: input.plan }),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend send failed [${response.status}]: ${errorBody}`);
      return { sent: false, reason: `EMAIL_FAILED_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("Resend send threw:", error);
    return { sent: false, reason: "EMAIL_NETWORK_ERROR" };
  }
}
