/** Small fetch wrapper for the content providers: timeout, bounded retries with exponential backoff, typed errors. */

export type ProviderErrorKind =
  "quota" | "auth" | "timeout" | "unavailable" | "bad_request" | "bad_response";

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: ProviderErrorKind,
    readonly status: number | null,
    message: string,
  ) {
    super(`${provider}: ${kind}${status ? ` (${status})` : ""}: ${message}`);
    this.name = "ProviderError";
  }
  /** Worth trying the same call again after a pause. Quota and auth errors are not. */
  get retryable(): boolean {
    return this.kind === "timeout" || this.kind === "unavailable";
  }
}

export interface RetryOptions {
  provider: string;
  timeoutMs: number;
  /** Total attempts, including the first. */
  attempts: number;
  baseDelayMs: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function classifyStatus(status: number): ProviderErrorKind | null {
  if (status >= 200 && status < 300) return null;
  if (status === 429 || status === 402) return "quota";
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status >= 500) return "unavailable";
  return "bad_request";
}

export function backoffDelay(attempt: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), 8_000);
}

/** POSTs JSON and returns the parsed JSON body. Throws ProviderError; the message never contains request headers. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: RetryOptions,
): Promise<unknown> {
  const doFetch = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  let last: ProviderError | null = null;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await doFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const kind = classifyStatus(response.status);
      if (kind === null) {
        try {
          return (await response.json()) as unknown;
        } catch {
          throw new ProviderError(
            options.provider,
            "bad_response",
            response.status,
            "body is not JSON",
          );
        }
      }
      const text = await response.text().catch(() => "");
      last = new ProviderError(options.provider, kind, response.status, text.slice(0, 200));
    } catch (error) {
      if (error instanceof ProviderError) last = error;
      else if (error instanceof Error && error.name === "AbortError")
        last = new ProviderError(
          options.provider,
          "timeout",
          null,
          `no answer in ${options.timeoutMs} ms`,
        );
      else last = new ProviderError(options.provider, "unavailable", null, "network error");
    } finally {
      clearTimeout(timer);
    }
    if (!last.retryable || attempt === options.attempts) break;
    await sleep(backoffDelay(attempt, options.baseDelayMs));
  }
  throw last ?? new ProviderError(options.provider, "unavailable", null, "no attempt made");
}
