import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const welcomeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  plan: z.string().trim().min(1).max(100),
});

export const sendEarlyAccessWelcome = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => welcomeSchema.parse(input))
  .handler(async ({ data }) => {
    const { sendWelcomeEmail } = await import("./early-access-email.server");
    return sendWelcomeEmail(data);
  });
