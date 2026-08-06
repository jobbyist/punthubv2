import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable. Please add it to your .env file."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY environment variable. Please add it to your .env file."
  );
}

// Create and export the typed Supabase client
// Uses the public anonymous key which is safe to use on the frontend
// All security is handled by Row Level Security (RLS) policies in Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Not using auth for early access form
  },
});
