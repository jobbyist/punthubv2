import { afterEach, describe, expect, it } from "vitest";

import { configuredPayfastUrl } from "./annual-pass-payment.server";

const KEY = "ANNUAL_PASS_PAYFAST_URL";

describe("configuredPayfastUrl", () => {
  const original = process.env[KEY];
  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it("accepts PayFast hosted and short links over https", () => {
    for (const url of ["https://payf.st/abc123", "https://www.payfast.co.za/eng/process?x=1"]) {
      process.env[KEY] = url;
      expect(configuredPayfastUrl()).toBe(url);
    }
  });

  it("rejects other hosts, http, credentials, odd ports and empty values", () => {
    for (const url of [
      "https://evil.example/abc",
      "http://payf.st/abc",
      "https://user:pw@payf.st/abc",
      "https://payf.st:8443/abc",
      "https://payf.st.evil.example/abc",
      "",
    ]) {
      process.env[KEY] = url;
      expect(configuredPayfastUrl()).toBeNull();
    }
  });
});
