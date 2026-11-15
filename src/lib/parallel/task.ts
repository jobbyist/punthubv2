/**
 * Parallel Task API client (deep research with a JSON output schema) and Responses client (Punt AI live-web
 * answers). Endpoints checked against docs.parallel.ai on 15 Nov 2026:
 *   POST /v1/tasks/runs                       (x-api-key)       -> { run_id, status }
 *   GET  /v1/tasks/runs/{run_id}/result?timeout=N               -> { run: { status }, output: { type, content, basis } }
 *   POST /v1/responses                        (Authorization: Bearer) model "parallel", reasoning.effort
 * Not called with a real key from this code yet: confirm `basis` item fields on the first live run.
 *
 * These clients do no quota or budget checks and no caching: wrap calls with the budget claim and cachedCall.
 * Never send personal data (CLAUDE.md, Privacy): inputs are about teams, fixtures and competitions only.
 */
import { ProviderError } from "@/lib/content/http";

import type { ChatEffort, TaskProcessor } from "./pricing";

const BASE = "https://api.parallel.ai";

type FetchLike = typeof fetch;

export type BasisItem = {
  field: string;
  citations: { url: string; title: string | null; excerpts: string[] }[];
  reasoning: string | null;
  confidence: string | null;
};

export type TaskResult<T> = { runId: string; content: T; basis: BasisItem[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function call(
  fetchImpl: FetchLike,
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      const kind =
        res.status === 401 || res.status === 403
          ? "auth"
          : res.status === 402 || res.status === 429
            ? "quota"
            : res.status >= 500
              ? "unavailable"
              : "bad_request";
      throw new ProviderError(provider, kind, res.status, text.slice(0, 200));
    }
    return text ? (JSON.parse(text) as unknown) : null;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const aborted = (error as Error).name === "AbortError";
    throw new ProviderError(
      provider,
      aborted ? "timeout" : "unavailable",
      null,
      (error as Error).message,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Parses the documented basis array defensively; unknown shapes become empty, never throw. */
export function parseBasis(raw: unknown): BasisItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((b) => ({
    field: str(b["field"]),
    citations: (Array.isArray(b["citations"]) ? b["citations"] : []).filter(isRecord).map((c) => ({
      url: str(c["url"]),
      title: str(c["title"]) || null,
      excerpts: Array.isArray(c["excerpts"]) ? c["excerpts"].map(str).filter(Boolean) : [],
    })),
    reasoning: str(b["reasoning"]) || null,
    confidence: str(b["confidence"]) || null,
  }));
}

export interface TaskRequest {
  input: string | Record<string, unknown>;
  processor: TaskProcessor;
  /** JSON Schema for the answer. Keep it small: every field costs research time. */
  outputSchema: Record<string, unknown>;
  includeDomains?: string[];
  metadata?: Record<string, string>;
  /** Total wait for the result, in seconds (Task lite usually 10-60 s). */
  waitSeconds?: number;
}

export function createParallelTask(apiKey: string, fetchImpl: FetchLike = fetch) {
  const provider = "parallel-task";
  return {
    async run<T = Record<string, unknown>>(req: TaskRequest): Promise<TaskResult<T>> {
      const body: Record<string, unknown> = {
        input: req.input,
        processor: req.processor,
        task_spec: { output_schema: { type: "json", json_schema: req.outputSchema } },
      };
      if (req.includeDomains?.length)
        body["source_policy"] = { include_domains: req.includeDomains };
      if (req.metadata) body["metadata"] = req.metadata;
      const created = await call(
        fetchImpl,
        provider,
        `${BASE}/v1/tasks/runs`,
        {
          method: "POST",
          headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        20_000,
      );
      const runId = isRecord(created) ? str(created["run_id"]) : "";
      if (!runId) throw new ProviderError(provider, "bad_response", null, "no run_id");

      const wait = Math.min(Math.max(req.waitSeconds ?? 90, 5), 280);
      const result = await call(
        fetchImpl,
        provider,
        `${BASE}/v1/tasks/runs/${encodeURIComponent(runId)}/result?timeout=${wait}`,
        { method: "GET", headers: { "x-api-key": apiKey } },
        (wait + 15) * 1000,
      );
      const run = isRecord(result) && isRecord(result["run"]) ? result["run"] : null;
      const output = isRecord(result) && isRecord(result["output"]) ? result["output"] : null;
      const status = run ? str(run["status"]) : "";
      if (status !== "completed" || !output) {
        throw new ProviderError(
          provider,
          "bad_response",
          null,
          `run ${runId} ${status || "no status"}`,
        );
      }
      return { runId, content: output["content"] as T, basis: parseBasis(output["basis"]) };
    },
  };
}

export function createParallelChat(apiKey: string, fetchImpl: FetchLike = fetch) {
  const provider = "parallel-chat";
  return {
    async ask(input: string, effort: ChatEffort = "low", includeDomains?: string[]) {
      const body: Record<string, unknown> = { model: "parallel", input, reasoning: { effort } };
      if (includeDomains?.length) {
        body["tools"] = [{ type: "web_search", filters: { allowed_domains: includeDomains } }];
      }
      const json = await call(
        fetchImpl,
        provider,
        `${BASE}/v1/responses`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        effort === "low" ? 30_000 : 60_000,
      );
      const text = extractOutputText(json);
      if (!text) throw new ProviderError(provider, "bad_response", null, "empty answer");
      return { text };
    },
  };
}

/** `output_text` when present, else the text parts of `message` items in `output[]`. */
export function extractOutputText(json: unknown): string {
  if (!isRecord(json)) return "";
  const direct = str(json["output_text"]);
  if (direct) return direct.trim();
  const items = Array.isArray(json["output"]) ? json["output"] : [];
  return items
    .filter((i) => isRecord(i) && i["type"] === "message")
    .flatMap((i) =>
      Array.isArray((i as Record<string, unknown>)["content"])
        ? ((i as Record<string, unknown>)["content"] as unknown[])
        : [],
    )
    .map((c) => (isRecord(c) ? str(c["text"]) : ""))
    .join("")
    .trim();
}
