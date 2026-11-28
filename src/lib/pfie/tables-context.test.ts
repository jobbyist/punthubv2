import { describe, expect, it, vi } from "vitest";
import { withJobUsageContext, type TablesDeps } from "./tables";

describe("withJobUsageContext", () => {
  it("sets competition/run context and persists it with sync metadata", async () => {
    const setUsageContext = vi.fn<(context: { competition: string; jobRunId: string; metadata?: Record<string, unknown> }) => void>();
    const record = vi.fn(async () => undefined);
    const deps = {
      search: { name: "search", search: vi.fn(async () => []) },
      extract: null,
      llm: { name: "llm", generate: vi.fn(async () => ({ text: "", model: "test" })) },
      store: { record } as unknown as TablesDeps["store"],
      setUsageContext,
    } as unknown as TablesDeps;

    const scoped = withJobUsageContext(deps, "championship", "history");
    const context = setUsageContext.mock.calls[0]?.[0] as {
      competition: string;
      jobRunId: string;
      metadata: Record<string, unknown>;
    };

    expect(context.competition).toBe("championship");
    expect(context.jobRunId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(context.metadata).toEqual({ job_kind: "history" });

    await scoped.store.record("history", "championship", true, null, { source: "test" });
    expect(record).toHaveBeenCalledWith(
      "history",
      "championship",
      true,
      null,
      expect.objectContaining({
        source: "test",
        competition: "championship",
        job_run_id: context.jobRunId,
        job_kind: "history",
      }),
    );
  });
});
