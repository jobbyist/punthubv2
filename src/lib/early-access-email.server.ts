const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface WelcomeEmailInput {
  name: string;
  email: string;
  plan: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderWelcomeEmail({ name, plan }: WelcomeEmailInput): string {
  const firstName = escapeHtml(name.split(" ")[0] || "there");
  const safePlan = escapeHtml(plan);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background-color:#0b3d2e;padding:28px 32px;">
                <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Puntr&trade;</div>
                <div style="font-size:12px;color:#9fe8c6;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Beta &bull; Early access</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">You're on the Puntr beta list, ${firstName}!</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">
                  Thanks for joining South Africa's AI-powered betting prediction community. Your spot is reserved and
                  we'll email you the moment your invite is ready.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
                  <tr>
                    <td style="font-size:14px;color:#4b5563;padding:4px 0;">Plan reserved</td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#0b3d2e;padding:4px 0;">${safePlan}</td>
                  </tr>
                  <tr>
                    <td style="font-size:14px;color:#4b5563;padding:4px 0;">Welcome bonus</td>
                    <td align="right" style="font-size:14px;font-weight:700;color:#0b3d2e;padding:4px 0;">1 000 PuntPoints</td>
                  </tr>
                </table>

                <p style="margin:24px 0 8px;font-size:15px;font-weight:600;">What happens next</p>
                <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#4b5563;">
                  <li>We review beta invites in batches &mdash; you'll be notified by email and SMS.</li>
                  <li>Your PuntPoints are credited automatically at launch.</li>
                  <li>No payment is taken during early access &mdash; you only reserve your plan.</li>
                </ul>

                <div style="margin-top:28px;">
                  <a href="https://punthubv2.lovable.app/predictions" style="display:inline-block;background-color:#0b3d2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;">Browse Puntr meanwhile</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.6;color:#9ca3af;">
                18+ only. Bet responsibly. Puntr&trade; provides predictions and insights only and does not accept bets.
                National Responsible Gambling Toll-Free Counselling Line: 0800 006 008.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const resendApiKey = process.env["RESEND_API_KEY"];

  if (!lovableApiKey || !resendApiKey) {
    console.error("Resend credentials missing; skipping early-access welcome email.");
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  }

  const from = process.env["RESEND_FROM"] || "Puntr <onboarding@resend.dev>";

  const response = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": resendApiKey,
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: `You're on the Puntr beta list — ${input.plan} reserved`,
      html: renderWelcomeEmail(input),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Resend send failed [${response.status}]: ${errorBody}`);
    return { sent: false, reason: `EMAIL_FAILED_${response.status}` };
  }

  return { sent: true };
}
