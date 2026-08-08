import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FORM_ENDPOINT = "https://www.formbackend.com/f/fc81b9bfaea4ed45";

const submissionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  plan: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(40),
});

/**
 * Forwards an Early Access signup to FormBackend, which handles deliverability
 * and notifies the Puntr team inbox. Returns a plain DTO only.
 */
export const submitEarlyAccessForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submissionSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          full_name: data.name,
          email: data.email,
          phone: data.phone,
          selected_plan: data.plan,
          source: "puntr-early-access",
          submitted_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`FormBackend submission failed [${response.status}]: ${body}`);
        return { sent: false as const, reason: `FORM_FAILED_${response.status}` };
      }

      return { sent: true as const };
    } catch (error) {
      console.error("FormBackend submission threw:", error);
      return { sent: false as const, reason: "FORM_NETWORK_ERROR" };
    }
  });
