import { describe, expect, it } from "vitest";

import { createParallelResponses, parallelJsonSchema } from "./providers.server";

describe("parallelJsonSchema", () => {
  it("converts nullable PFIE fields into JSON Schema type unions while preserving required keys", () => {
    expect(
      parallelJsonSchema({
        type: "OBJECT",
        properties: {
          source: { type: "INTEGER" },
          time: { type: "STRING", nullable: true },
          score: { type: "INTEGER", nullable: true },
        },
        required: ["source"],
      }),
    ).toEqual({
      type: "object",
      properties: {
        source: { type: "integer" },
        time: { type: ["string", "null"] },
        score: { type: ["integer", "null"] },
      },
      required: ["source"],
      additionalProperties: false,
    });
  });
});

describe("createParallelResponses", () => {
  it("uses Parallel JSON Schema output with the configured low reasoning effort", async () => {
    let sent = null as Record<string, unknown> | null;
    const fetchImpl: typeof fetch = async (_input, init) => {
      sent = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({ output_text: '{"matches":[]}' }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const provider = createParallelResponses(
      "test-key",
      { fetchImpl, attempts: 1 },
      { effort: "low" },
    );
    const result = await provider.generate("parallel-low", {
      system: "Return one JSON object.",
      prompt: "Extract matches.",
      schema: { type: "OBJECT", properties: { matches: { type: "ARRAY" } } },
      temperature: 0,
      maxOutputTokens: 128,
    });
    expect(result.text).toBe('{"matches":[]}');
    expect(sent).toMatchObject({
      model: "parallel",
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "puntr_structured_output" } },
    });
    expect((sent?.["text"] as { format: Record<string, unknown> }).format).not.toHaveProperty(
      "strict",
    );
    expect((sent?.["text"] as { format: Record<string, unknown> }).format["schema"]).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
  });
});
