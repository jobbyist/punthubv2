/**
 * Hard caps on external APIs. Every PFIE provider call claims one unit in Postgres first; a denied or unchecked
 * claim is fail-closed. Claim attempts carry competition/run context and are finalised as succeeded/failed.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ProviderError } from "@/lib/content/http";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";

export interface ClaimResult {
  granted: boolean;
  attemptId: string;
  reasonCode?: string;
}
export interface ClaimContext {
  competition?: string | null;
  jobRunId?: string | null;
  feature?: string | null;
  metadata?: Record<string, unknown>;
}
export type Claim = ((provider: string) => Promise<ClaimResult>) & {
  recordResult: (
    attemptId: string,
    status: "succeeded" | "failed",
    reasonCode?: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
};

/** A denied provider is memoized for this cron job; the database backoff persists across cron invocations. */
export function memoizeQuotaClaim(
  claim: (provider: string) => Promise<ClaimResult>,
  recordResult: Claim["recordResult"] = async () => undefined,
): Claim {
  const denied = new Map<string, ClaimResult>();
  const wrapped = (async (provider: string) => {
    const previous = denied.get(provider);
    if (previous) return previous;
    const result = await claim(provider);
    if (!result.granted) denied.set(provider, result);
    return result;
  }) as Claim;
  wrapped.recordResult = recordResult;
  return wrapped;
}

/**
 * Creates a claim function for one PFIE job. The context getter is updated before each competition run, so every
 * Search, Extract and Responses claim is tied to a competition and a stable job-run UUID.
 */
export async function createQuotaClaim(
  feature: string,
  getContext: () => ClaimContext = () => ({}),
): Promise<Claim> {
  if (!feature.trim() || feature === "unattributed") {
    throw new Error("createQuotaClaim requires a named feature for usage attribution");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;

  const rawClaim = async (provider: string): Promise<ClaimResult> => {
    const attemptId = randomUUID();
    const context = getContext();
    try {
      const { data, error } = await db.rpc("api_budget_claim_context", {
        p_provider: provider,
        p_units: 1,
        p_feature: context.feature?.trim() || feature,
        p_competition: context.competition ?? null,
        p_job_run_id: context.jobRunId ?? null,
        p_attempt_id: attemptId,
        p_metadata: context.metadata ?? {},
      });
      if (error) {
        console.error("quota: contextual budget claim failed; refusing the call", provider, error.message);
        return { granted: false, attemptId, reasonCode: "budget_rpc_unavailable" };
      }
      const result = data as { granted?: boolean; attempt_id?: string; reason_code?: string | null } | null;
      return {
        granted: result?.granted === true,
        attemptId: result?.attempt_id ?? attemptId,
        ...(result?.reason_code ? { reasonCode: result.reason_code } : {}),
      };
    } catch (error) {
      console.error("quota: contextual budget claim unavailable; refusing the call", provider, error);
      return { granted: false, attemptId, reasonCode: "budget_rpc_unavailable" };
    }
  };

  const recordResult: Claim["recordResult"] = async (attemptId, status, reasonCode, metadata = {}) => {
    try {
      const { error } = await db.rpc("api_call_event_result", {
        p_attempt_id: attemptId,
        p_status: status,
        p_reason_code: reasonCode ?? null,
        p_metadata: metadata,
      });
      if (error) console.error("quota: could not finalise API call event", attemptId, error.message);
    } catch (error) {
      console.error("quota: API call event finalisation unavailable", attemptId, error);
    }
  };

  return memoizeQuotaClaim(rawClaim, recordResult);
}

export async function recordQuotaError(provider: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { error } = await db.rpc("api_quota_error", { p_provider: provider });
  if (error) console.error("quota: could not record an error", provider, error.message);
}

const refused = (provider: string, reasonCode?: string) =>
  new ProviderError(
    provider,
    "quota",
    null,
    reasonCode
      ? `Puntr budget guard refused this call (${reasonCode})`
      : "Puntr budget guard refused this call",
    reasonCode,
  );

function failureReason(error: unknown): string {
  if (error instanceof ProviderError) {
    return error.kind === "quota" ? "upstream_quota" : `upstream_${error.kind}`;
  }
  return "unexpected_error";
}

export function guardSearch(inner: SearchProvider, claim: Claim): SearchProvider {
  return {
    name: inner.name,
    async search(input) {
      const attempt = await claim(inner.name);
      if (!attempt.granted) throw refused(inner.name, attempt.reasonCode);
      try {
        const result = await inner.search(input);
        await claim.recordResult(attempt.attemptId, "succeeded");
        return result;
      } catch (error) {
        await claim.recordResult(attempt.attemptId, "failed", failureReason(error));
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
      const attempt = await claim(inner.name);
      if (!attempt.granted) throw refused(inner.name, attempt.reasonCode);
      try {
        const result = await inner.extract(url);
        await claim.recordResult(attempt.attemptId, "succeeded");
        return result;
      } catch (error) {
        await claim.recordResult(attempt.attemptId, "failed", failureReason(error));
        await recordQuotaError(inner.name);
        throw error;
      }
    },
  };
}

/** Parallel model claims are keyed by their effort; a hard quota denial must not be bypassed by another model. */
export function guardLlm(inner: LlmProvider, claim: Claim): LlmProvider {
  return {
    name: inner.name,
    async generate(model, request) {
      const parallelEffort = /^parallel-(low|medium|high)$/.exec(model)?.[1];
      const key = parallelEffort ? `parallel-chat:${parallelEffort}` : `gemini:${model}`;
      const attempt = await claim(key);
      if (!attempt.granted) throw refused(key, attempt.reasonCode);
      try {
        const result = await inner.generate(model, request);
        await claim.recordResult(attempt.attemptId, "succeeded", undefined, { model });
        return result;
      } catch (error) {
        await claim.recordResult(attempt.attemptId, "failed", failureReason(error), { model });
        await recordQuotaError(key);
        throw error;
      }
    },
  };
}
