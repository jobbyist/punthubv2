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

/** PostgREST "function not found": the budget migration (20261115010000) is not applied yet. */
const isMissingFunction = (error: { code?: string; message: string }) =>
  error.code === "PGRST202" || /could not find the function/i.test(error.message);

/**
 * Claims one unit. `api_budget_claim` checks the provider family's monthly USD budget (docs/PARALLEL_ARCHITECTURE.md)
 * and then the call caps; before that migration is applied it falls back to the call caps alone, so deploying this
 * code first changes nothing.
 */
export async function createQuotaClaim(feature: string): Promise<Claim> {
  if (!feature.trim() || feature === "unattributed") {
    throw new Error("createQuotaClaim requires a named feature for usage attribution");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  let budgetAvailable = true;

  const recordClaim = async (provider: string) => {
    try {
      const [consumer, ...operationParts] = feature.split(":");
      const { error } = await db.from("api_call_events").insert({
        provider,
        feature,
        consumer: consumer || "unknown",
        operation: operationParts.join(":") || "request",
        status: "claimed",
        metadata: { attribution_source: "quota_guard", budget_checked: true },
      });
      if (error) {
        console.warn("quota: call attribution could not be recorded", provider, feature, error.message);
      }
    } catch {
      console.warn("quota: call attribution unavailable", provider, feature);
    }
  };

  return async (provider) => {
    if (budgetAvailable) {
      const { data, error } = await db.rpc("api_budget_claim", {
        p_provider: provider,
        p_units: 1,
        p_feature: feature,
      });
      if (!error) {
        // api_budget_claim writes the attribution event in the same transaction as the quota debit.
        return data === true;
      }
      if (!isMissingFunction(error)) {
        console.error("quota: budget claim failed, refusing the call", provider, error.message);
        return false;
      }
      budgetAvailable = false;
    }

    const { data, error } = await db.rpc("api_quota_claim", { p_provider: provider, p_units: 1 });
    if (error) {
      console.error("quota: claim failed, refusing the call", provider, error.message);
      return false;
    }
    const granted = data === true;
    if (granted) await recordClaim(provider);
    return granted;
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
      try {
        return await inner.search(input);
      } catch (error) {
        await recordQuotaError(inner.name);
        throw error;
      }
    },
  };
}

export function guardExtract(inner: ExtractProvider, claim: Claim): ExtractProvider {
  return {
    name: inner.name,
    async extract(url) {
      if (!(await claim(inner.name))) throw refused(inner.name);
      try {
        return await inner.extract(url);
      } catch (error) {
        await recordQuotaError(inner.name);
        throw error;
      }
    },
  };
}

/** Gemini quotas are per model: `gemini:<model id>`. A refused claim moves the router to the next model. */
export function guardLlm(inner: LlmProvider, claim: Claim): LlmProvider {
  return {
    name: inner.name,
    async generate(model, request) {
      const parallelEffort = /^parallel-(low|medium|high)$/.exec(model)?.[1];
      const key = parallelEffort ? `parallel-chat:${parallelEffort}` : `gemini:${model}`;
      if (!(await claim(key))) throw refused(key);
      try {
        return await inner.generate(model, request);
      } catch (error) {
        await recordQuotaError(key);
        throw error;
      }
    },
  };
}
