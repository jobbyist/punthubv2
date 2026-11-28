import { ProviderError } from "@/lib/content/http";

type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type ParallelDecisionRequest = {
  mode?: "fast";
  state: Record<string, unknown>;
  questions: Record<string, ChoiceQuestion>;
};

function errorKind(status: number): "auth" | "quota" | "unavailable" | "bad_request" {
  if (status === 401 || status === 403) return "auth";
  if (status === 402 || status === 429) return "quota";
  if (status === 408 || status >= 500) return "unavailable";
  return "bad_request";
}

/** Parallel Decisions API. The caller must wrap this with the existing cache and quota guard. */
export function createParallelDecisions(apiKey: string, fetchImpl: typeof fetch = fetch) {
  return {
    async decide(input: ParallelDecisionRequest): Promise<Record<string, unknown>> {
      if (!apiKey)
        throw new ProviderError("parallel", "auth", null, "PARALLEL_API_KEY is not configured");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await fetchImpl("https://api.parallel.ai/v1/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        const raw = await response.text();
        if (!response.ok) {
          throw new ProviderError(
            "parallel",
            errorKind(response.status),
            response.status,
            raw.slice(0, 300),
          );
        }
        let result: unknown;
        try {
          result = JSON.parse(raw);
        } catch {
          throw new ProviderError(
            "parallel",
            "bad_response",
            response.status,
            "Response was not valid JSON",
          );
        }
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new ProviderError(
            "parallel",
            "bad_response",
            response.status,
            "Response was not an object",
          );
        }
        return result as Record<string, unknown>;
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        const aborted = error instanceof Error && error.name === "AbortError";
        throw new ProviderError(
          "parallel",
          aborted ? "timeout" : "unavailable",
          null,
          error instanceof Error ? error.message : "Unknown provider error",
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
