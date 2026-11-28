import { describe, expect, it } from "vitest";

import { parallelJsonSchema } from "./providers.server";

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
