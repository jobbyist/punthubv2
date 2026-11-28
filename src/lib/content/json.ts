/**
 * Parse the first complete JSON object in a model response.
 *
 * Providers occasionally wrap otherwise-valid structured output in Markdown fences or a short preamble.
 * This helper removes those presentation wrappers without attempting to repair malformed/truncated JSON.
 */
export function parseJsonObject(text: string): unknown | null {
  const input = text.trim();
  if (!input) return null;

  const candidate = input
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  try {
    const value: unknown = JSON.parse(candidate);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) return value;
  } catch {
    // Try to isolate a complete object from prose surrounding it.
  }

  const start = candidate.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const char = candidate[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char.charCodeAt(0) === 92) escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          const value: unknown = JSON.parse(candidate.slice(start, i + 1));
          return typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
