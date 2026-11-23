/**
 * Parallel-first editorial model router with allowlisted Gemini fallbacks.
 *
 * - A model outside APPROVED_CONTENT_MODELS is never called, whatever the configuration says.
 * - A quota or auth error moves straight to the next model. A timeout or 5xx also moves on while another model is
 *   left to try (a busy model stays busy, and with five models retrying each one would outlast the run budget);
 *   only the last model in the chain gets one retry after a pause.
 * - A model that has reached the engine's own requests-per-day ceiling is skipped without a call.
 * - When every model fails the router throws AllModelsFailed; the pipeline then records the failure and publishes
 *   nothing.
 */
import { APPROVED_CONTENT_MODELS } from "./config";
import { backoffDelay, ProviderError } from "./http";
import type { LlmProvider, LlmRequest, LlmResult } from "./types";

export interface ModelAttempt {
  model: string;
  outcome: "ok" | "skipped_cap" | "refused_not_allowlisted" | ProviderError["kind"] | "error";
  detail?: string;
}

export class AllModelsFailed extends Error {
  constructor(readonly attempts: ModelAttempt[]) {
    super(`all models failed: ${attempts.map((a) => `${a.model}=${a.outcome}`).join(", ")}`);
    this.name = "AllModelsFailed";
  }
}

export interface RouterOptions {
  models: string[];
  /** Requests already made today per model, and the ceiling per model (missing or 0 = no ceiling). */
  usedToday?: Record<string, number>;
  dailyCap?: Record<string, number>;
  onAttempt?: (attempt: ModelAttempt) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  retryDelayMs?: number;
}

export interface Routed extends LlmResult {
  attempts: ModelAttempt[];
}

export function createModelRouter(provider: LlmProvider, options: RouterOptions) {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const used: Record<string, number> = { ...(options.usedToday ?? {}) };

  async function note(attempts: ModelAttempt[], attempt: ModelAttempt) {
    attempts.push(attempt);
    await options.onAttempt?.(attempt);
  }

  return {
    /** `prefer` moves one model to the front (used for the independent review pass). */
    async generate(request: LlmRequest, prefer?: string): Promise<Routed> {
      const order =
        prefer && options.models.includes(prefer)
          ? [prefer, ...options.models.filter((m) => m !== prefer)]
          : [...options.models];
      const attempts: ModelAttempt[] = [];

      const lastUsable = [...order].reverse().find((m) => APPROVED_CONTENT_MODELS.includes(m));

      for (const model of order) {
        if (!APPROVED_CONTENT_MODELS.includes(model)) {
          await note(attempts, { model, outcome: "refused_not_free" });
          continue;
        }
        const cap = options.dailyCap?.[model] ?? 0;
        if (cap > 0 && (used[model] ?? 0) >= cap) {
          await note(attempts, {
            model,
            outcome: "skipped_cap",
            detail: `${used[model]}/${cap} today`,
          });
          continue;
        }
        for (let tryNo = 1; tryNo <= 2; tryNo++) {
          used[model] = (used[model] ?? 0) + 1;
          try {
            const result = await provider.generate(model, request);
            await note(attempts, { model, outcome: "ok" });
            return { ...result, attempts };
          } catch (error) {
            if (error instanceof ProviderError) {
              await note(attempts, {
                model,
                outcome: error.kind,
                detail: error.message.slice(0, 200),
              });
              if (error.retryable && tryNo === 1 && model === lastUsable) {
                await sleep(backoffDelay(1, options.retryDelayMs ?? 1_500));
                continue;
              }
            } else {
              await note(attempts, { model, outcome: "error", detail: "unexpected error" });
            }
            break;
          }
        }
      }
      throw new AllModelsFailed(attempts);
    },
  };
}

export type ModelRouter = ReturnType<typeof createModelRouter>;
