import { afterEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "@/lib/analytics";

describe("synthetic QA analytics exclusion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks analytics delivery even when analytics consent is present", () => {
    const dataLayer: unknown[] = [];
    const gtag = vi.fn();
    const setItem = vi.fn();

    vi.stubGlobal("document", {
      cookie: [
        "puntr_synthetic_qa=1",
        "puntr_consent=%7B%22v%22%3A1%2C%22id%22%3A%22synthetic-test%22%2C%22analytics%22%3Atrue%2C%22affiliate_tracking%22%3Afalse%2C%22ts%22%3A%222026-11-27T00%3A00%3A00.000Z%22%7D",
      ].join("; "),
    });
    vi.stubGlobal("window", {
      dataLayer,
      gtag,
      sessionStorage: { setItem },
    });

    trackEvent("landing_viewed", { source: "synthetic-qa-test" });

    expect(dataLayer).toHaveLength(0);
    expect(gtag).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
