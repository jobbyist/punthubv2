import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

type EarlyAccessInsert = Database["public"]["Tables"]["early_access"]["Insert"];

export interface EarlyAccessSubmission {
  email: string;
  name: string;
  plan: string;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Sanitize input by trimming whitespace and basic validation
 */
function sanitizeInput(input: string): string {
  return input.trim();
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if an email already exists in the early_access table
 */
export async function checkExistingEmail(email: string): Promise<boolean> {
  try {
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    
    const { data, error } = await supabase
      .from("early_access")
      .select("email")
      .eq("email", sanitizedEmail)
      .maybeSingle();

    if (error) {
      console.error("Error checking existing email:", error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error("Unexpected error checking email:", error);
    return false;
  }
}

/**
 * Submit early access form data to Supabase
 */
export async function submitEarlyAccess(
  data: EarlyAccessSubmission
): Promise<SubmissionResult> {
  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(data.email).toLowerCase();
    const sanitizedName = sanitizeInput(data.name);
    const sanitizedPlan = sanitizeInput(data.plan);

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
        error: "INVALID_EMAIL",
      };
    }

    // Check for duplicate email first
    const exists = await checkExistingEmail(sanitizedEmail);
    if (exists) {
      return {
        success: false,
        message: "This email is already registered for early access.",
        error: "DUPLICATE_EMAIL",
      };
    }

    // Insert the early access record
    const insertData: EarlyAccessInsert = {
      email: sanitizedEmail,
      name: sanitizedName,
      plan: sanitizedPlan,
      status: "pending",
    };

    const { error } = await supabase.from("early_access").insert(insertData);

    if (error) {
      // Check if it's a unique constraint violation (race condition)
      if (error.code === "23505") {
        return {
          success: false,
          message: "This email is already registered for early access.",
          error: "DUPLICATE_EMAIL",
        };
      }

      console.error("Supabase insert error:", error);
      return {
        success: false,
        message: "Unable to submit your request. Please try again.",
        error: error.message,
      };
    }

    return {
      success: true,
      message: "Successfully registered for early access!",
    };
  } catch (error) {
    console.error("Unexpected error submitting early access:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}
