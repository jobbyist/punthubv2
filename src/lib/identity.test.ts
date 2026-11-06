import { describe, expect, it } from "vitest";

import { checkIdDocument, ID_DOC_MAX_BYTES, idDocumentPath } from "./identity";

describe("identity documents", () => {
  it("accepts images and PDFs under 10 MB", () => {
    expect(checkIdDocument({ size: 100, type: "application/pdf" })).toEqual({ ok: true });
    expect(checkIdDocument({ size: ID_DOC_MAX_BYTES - 1, type: "image/jpeg" })).toEqual({
      ok: true,
    });
  });
  it("refuses 10 MB or more and other types", () => {
    expect(checkIdDocument({ size: ID_DOC_MAX_BYTES, type: "image/png" })).toEqual({
      ok: false,
      reason: "tooBig",
    });
    expect(checkIdDocument({ size: 10, type: "image/gif" })).toEqual({
      ok: false,
      reason: "badType",
    });
  });
  it("puts the file in the member's folder with a random name", () => {
    expect(idDocumentPath("u1", "application/pdf", "abc")).toBe("u1/abc.pdf");
  });
});
