import { describe, expect, it } from "vitest";

import { createParallelResponses, parallelJsonSchema } from "./providers.server";

describe("parallelJsonSchema", () => {
  it("converts nullable PFIE fields into JSON Schema type unions and requires every property", () => {
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
      required: ["source", "time", "score"],
      additionalProperties: false,
    });
  });
});


describe("createParallelResponses", () => {
  it("uses a prompt-based JSON contract with the configured low reasoning effort", async () => {
    let sent: Record<string, unknown> | null = null;
    const fetchImpl: typeof fetch = async (_input, init) => {
      sent = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({ output_text: '{"matches":[]}' }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const provider = createParallelResponses("test-key", { fetchImpl, attempts: 1 }, { effort: "low" });
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
    });
    expect(sent).not.toHaveProperty("text");
    expect((sent?.["input"] as { role: string; content: string }[])[0]?.content).toContain('"matches"');
    expect((sent?.["input"] as { role: string; content: string }[])[0]?.content).toContain("OUTPUT SCHEMA");
  });
});
