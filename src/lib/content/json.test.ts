import { describe, expect, it } from "vitest";

import { parseJsonObject } from "./json";

describe("parseJsonObject", () => {
  it("parses plain JSON objects", () => {
    expect(parseJsonObject('{"matches":[]}')).toEqual({ matches: [] });
  });

  it("parses JSON wrapped in Markdown fences", () => {
    expect(parseJsonObject('```json\n{"matches":[]}\n```')).toEqual({ matches: [] });
  });

  it("extracts one complete object from surrounding prose", () => {
    expect(parseJsonObject('Result:\n{"matches":[{"home":"A"}]}\nDone.')).toEqual({
      matches: [{ home: "A" }],
    });
  });

  it("handles braces and escaped quotes inside JSON strings", () => {
    expect(parseJsonObject('prefix {"quote":"a } and \\"b\\""} suffix')).toEqual({
      quote: 'a } and "b"',
    });
  });

  it("does not attempt to repair truncated or malformed JSON", () => {
    expect(parseJsonObject('{"matches":[')).toBeNull();
    expect(parseJsonObject("not JSON")).toBeNull();
    expect(parseJsonObject("[]")).toBeNull();
  });
});
