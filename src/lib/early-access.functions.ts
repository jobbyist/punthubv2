import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FORM_ENDPOINT = "https://www.formbackend.com/f/fc81b9bfaea4ed45";

const submissionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  plan: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(40),
  sports: z.array(z.string().trim().max(40)).max(20).optional(),
  bookmakers: z.array(z.string().trim().max(40)).max(20).optional(),
  experience: z.string().trim().max(60).optional(),
  marketingOptIn: z.boolean().optional(),
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
          sports: data.sports?.join(", ") ?? "",
          bookmakers: data.bookmakers?.join(", ") ?? "",
          experience: data.experience ?? "",
          marketing_opt_in: data.marketingOptIn ? "yes" : "no",
          source: "puntr-early-access",
          submitted_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`FormBackend submission failed [${response.status}]: ${body}`);
        return { sent: false as const, reason: `FORM_FAILED_${response.status}` };
      }

      const result = (await response.json().catch(() => null)) as { errors?: unknown[] } | null;
      if (result?.errors && result.errors.length > 0) {
        console.error("FormBackend validation errors:", JSON.stringify(result.errors));
        return { sent: false as const, reason: "FORM_VALIDATION" };
      }

      return { sent: true as const };

    } catch (error) {
      console.error("FormBackend submission threw:", error);
      return { sent: false as const, reason: "FORM_NETWORK_ERROR" };
    }
  });
