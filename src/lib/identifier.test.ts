import { describe, expect, it } from "vitest";

import { parseIdentifier } from "./identifier";

describe("parseIdentifier", () => {
  it("reads emails and usernames", () => {
    expect(parseIdentifier(" Jane@Example.com ")).toEqual({
      kind: "email",
      value: "jane@example.com",
    });
    expect(parseIdentifier("Tip_One")).toEqual({ kind: "username", value: "tip_one" });
    expect(parseIdentifier("@tip_one")).toEqual({ kind: "username", value: "tip_one" });
  });
  it("rejects anything else", () => {
    expect(parseIdentifier("a!")).toEqual({ kind: "invalid" });
    expect(parseIdentifier("not an email@")).toEqual({ kind: "invalid" });
    expect(parseIdentifier("")).toEqual({ kind: "invalid" });
  });
});
