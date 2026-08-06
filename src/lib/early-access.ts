import { supabase } from "@/integrations/supabase/client";

export interface EarlyAccessSubmission {
  email: string;
  name: string;
  phone: string;
  plan: string;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

function sanitizeInput(input: string): string {
  return input.trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[0-9+()\s-]{7,20}$/.test(phone);
}

/**
 * Submit early access form data to the backend.
 */
export async function submitEarlyAccess(data: EarlyAccessSubmission): Promise<SubmissionResult> {
  try {
    const email = sanitizeInput(data.email).toLowerCase();
    const name = sanitizeInput(data.name);
    const phone = sanitizeInput(data.phone);
    const plan = sanitizeInput(data.plan);

    if (!isValidEmail(email)) {
      return { success: false, message: "Please enter a valid email address.", error: "INVALID_EMAIL" };
    }

    if (!isValidPhone(phone)) {
      return { success: false, message: "Please enter a valid phone number.", error: "INVALID_PHONE" };
    }

    const { error } = await supabase.from("early_access").insert({
      email,
      name,
      phone,
      plan,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "This email is already registered for early access.",
          error: "DUPLICATE_EMAIL",
        };
      }
      console.error("Early access insert error:", error);
      return { success: false, message: "Unable to submit your request. Please try again.", error: error.message };
    }

    return { success: true, message: "Successfully registered for early access!" };
  } catch (error) {
    console.error("Unexpected error submitting early access:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
