import { describe, expect, it, vi } from "vitest";

import { AllModelsFailed, createModelRouter } from "./model-router";
import { ProviderError } from "./http";
import type { LlmProvider, LlmRequest } from "./types";

const request: LlmRequest = {
  system: "system",
  prompt: "prompt",
  temperature: 0,
  maxOutputTokens: 128,
  schema: { type: "object", properties: { ok: { type: "boolean" } } },
};

describe("createModelRouter quota stop policy", () => {
  it("stops the PFIE chain on a hard quota denial instead of trying another model", async () => {
    const provider: LlmProvider = {
      name: "parallel-responses",
      generate: vi.fn(async (model) => {
        if (model === "parallel-low") {
          throw new ProviderError("parallel-chat:low", "quota", 429, "daily cap reached", "provider_daily_call_cap_exhausted");
        }
        return { model, text: '{"ok":true}' };
      }),
    };
    const router = createModelRouter(provider, {
      models: ["parallel-low", "parallel-medium"],
      stopOnQuota: true,
    });

    await expect(router.generate(request)).rejects.toBeInstanceOf(AllModelsFailed);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(provider.generate).toHaveBeenCalledWith("parallel-low", request);
  });

  it("retains the existing fallback behavior when stopOnQuota is not enabled", async () => {
    const provider: LlmProvider = {
      name: "parallel-responses",
      generate: vi.fn(async (model) => {
        if (model === "parallel-low") throw new ProviderError("parallel-chat:low", "quota", 429, "daily cap reached");
        return { model, text: '{"ok":true}' };
      }),
    };
    const router = createModelRouter(provider, { models: ["parallel-low", "parallel-medium"] });

    const result = await router.generate(request);
    expect(result.model).toBe("parallel-medium");
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });
});
