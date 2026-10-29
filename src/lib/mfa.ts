import { supabase } from "@/integrations/supabase/client";

/** True when the member has two-factor sign-in on and this session has not passed it yet. */
export async function mfaRequired(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

/** The member's verified authenticator-app factor, if any. */
export async function verifiedTotpFactor() {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified") ?? null;
}
