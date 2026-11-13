/**
 * Hard caps on every external API (migration 20261113170000). Each call claims one unit in Postgres first; a claim
 * over the provider's daily or monthly cap is refused and the call is never made. Fail closed: if the claim itself
 * cannot be checked, the call is not made either.
 *
 * Server only. Limits are edited in /admin > System.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProviderError } from "@/lib/content/http";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";

export type Claim = (provider: string) => Promise<boolean>;

export async function createQuotaClaim(): Promise<Claim> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  return async (provider) => {
    const { data, error } = await db.rpc("api_quota_claim", { p_provider: provider, p_units: 1 });
    if (error) {
      console.error("quota: claim failed, refusing the call", provider, error.message);
      return false;
    }
    return data === true;
  };
}

export async function recordQuotaError(provider: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { error } = await db.rpc("api_quota_error", { p_provider: provider });
  if (error) console.error("quota: could not record an error", provider, error.message);
}

const refused = (provider: string) =>
  new ProviderError(
    provider,
    "quota",
    null,
    "Puntr's own daily or monthly cap for this service is reached",
  );

export function guardSearch(inner: SearchProvider, claim: Claim): SearchProvider {
  return {
    name: inner.name,
    async search(input) {
      if (!(await claim(inner.name))) throw refused(inner.name);
      return inner.search(input);
    },
  };
}

export function guardExtract(inner: ExtractProvider, claim: Claim): ExtractProvider {
  return {
    name: inner.name,
    async extract(url) {
      if (!(await claim(inner.name))) throw refused(inner.name);
      return inner.extract(url);
    },
  };
}

/** Gemini quotas are per model: `gemini:<model id>`. A refused claim moves the router to the next model. */
export function guardLlm(inner: LlmProvider, claim: Claim): LlmProvider {
  return {
    name: inner.name,
    async generate(model, request) {
      const key = `gemini:${model}`;
      if (!(await claim(key))) throw refused(key);
      return inner.generate(model, request);
    },
  };
}
