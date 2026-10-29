import { describe, expect, it } from "vitest";

import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts a reasonable password", () => {
    expect(validatePassword("long enough phrase", "a@b.co")).toBeNull();
  });
  it("refuses short, over-long, common and email-like passwords", () => {
    expect(validatePassword("short", "a@b.co")).toBe("short");
    expect(validatePassword("x".repeat(73), "a@b.co")).toBe("long");
    expect(validatePassword("Password123", "a@b.co")).toBe("common");
    expect(validatePassword("jane@example.com", "jane@example.com")).toBe("sameAsEmail");
    expect(validatePassword("janedoe99", "janedoe99@example.com")).toBe("sameAsEmail");
  });
  it("counts bytes, not characters, for the upper limit", () => {
    expect(validatePassword("é".repeat(37), "a@b.co")).toBe("long");
  });
});
