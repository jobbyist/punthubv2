/**
 * Hard caps on every external API. Each actual provider attempt is attributed before it is made.
 * A denied provider is memoized for the rest of the job, and the database applies cross-job cooldowns.
 * Fail closed: if the claim cannot be checked, the provider call is not made.
 *
 * Server only. Limits are edited in /admin > System.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProviderError } from "@/lib/content/http";
import type { ExtractProvider, LlmProvider, SearchProvider, UsageContext } from "@/lib/content/types";

export type Claim = (provider: string, context?: UsageContext) => Promise<boolean>;

/** A denied provider stays denied for the remainder of one job; do not hammer the quota ledger per URL/retry. */
export function memoizeQuotaClaim(claim: Claim): Claim {
  const denied = new Set<string>();
  return async (provider, context) => {
    if (denied.has(provider)) return false;
    const granted = await claim(provider, context);
    if (!granted) denied.add(provider);
    return granted;
  };
}

/** Claims one unit and atomically writes context, cost estimate and refusal state to the usage ledger. */
export async function createQuotaClaim(feature: string): Promise<Claim> {
  if (!feature.trim() || feature === "unattributed") {
    throw new Error("createQuotaClaim requires a named feature for usage attribution");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;

  return memoizeQuotaClaim(async (provider, context) => {
    const requestId = context?.requestId ?? randomUUID();
    const p_context = {
      request_id: requestId,
      competition: context?.competition ?? null,
      job_run_id: context?.jobRunId ?? null,
      job_kind: context?.jobKind ?? null,
    };
    const { data, error } = await db.rpc("api_budget_claim_with_context", {
      p_provider: provider,
      p_units: 1,
      p_feature: feature,
      p_context,
    });
    if (error) {
      console.error("quota: contextual budget claim failed; refusing the call", provider, feature, error.message);
      return false;
    }
    return data === true;
  });
}

async function finishQuotaEvent(
  provider: string,
  requestId: string,
  status: "success" | "error",
  errorMessage?: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.rpc("api_call_event_finish", {
    p_provider: provider,
    p_request_id: requestId,
    p_status: status,
    p_error: errorMessage ?? null,
  });
  if (error || data !== true) {
    console.error("quota: provider attempt outcome could not be recorded", provider, status, error?.message ?? "event not found");
  }
}

const refused = (provider: string) =>
  new ProviderError(
    provider,
    "quota",
    null,
    "Puntr's provider budget or quota is exhausted; this request has been deferred",
  );

const attemptContext = (context?: UsageContext): UsageContext => ({
  ...context,
  requestId: randomUUID(),
});

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message.slice(0, 280) : "provider request failed";

export function guardSearch(inner: SearchProvider, claim: Claim): SearchProvider {
  return {
    name: inner.name,
    async search(input, context) {
      const attempt = attemptContext(context);
      if (!(await claim(inner.name, attempt))) throw refused(inner.name);
      try {
        const result = await inner.search(input, context);
        await finishQuotaEvent(inner.name, attempt.requestId!, "success");
        return result;
      } catch (error) {
        await finishQuotaEvent(inner.name, attempt.requestId!, "error", errorMessage(error));
        throw error;
      }
    },
  };
}

export function guardExtract(inner: ExtractProvider, claim: Claim): ExtractProvider {
  return {
    name: inner.name,
    async extract(url, context) {
      const attempt = attemptContext(context);
      if (!(await claim(inner.name, attempt))) throw refused(inner.name);
      try {
        const result = await inner.extract(url, context);
        await finishQuotaEvent(inner.name, attempt.requestId!, "success");
        return result;
      } catch (error) {
        await finishQuotaEvent(inner.name, attempt.requestId!, "error", errorMessage(error));
        throw error;
      }
    },
  };
}

/** Responses quotas are per effort: parallel-chat:<effort>. */
export function guardLlm(inner: LlmProvider, claim: Claim): LlmProvider {
  return {
    name: inner.name,
    async generate(model, request, context) {
      const parallelEffort = /^parallel-(low|medium|high)$/.exec(model)?.[1];
      const key = parallelEffort ? "parallel-chat:" + parallelEffort : "gemini:" + model;
      const attempt = attemptContext(context);
      if (!(await claim(key, attempt))) throw refused(key);
      try {
        const result = await inner.generate(model, request, context);
        await finishQuotaEvent(key, attempt.requestId!, "success");
        return result;
      } catch (error) {
        await finishQuotaEvent(key, attempt.requestId!, "error", errorMessage(error));
        throw error;
      }
    },
  };
}
