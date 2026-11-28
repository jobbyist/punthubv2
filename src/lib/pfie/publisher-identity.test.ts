import { describe, expect, it } from "vitest";

import { publisherKey } from "./publisher-identity";

describe("canonical publisher identity", () => {
  it("collapses subdomains and www aliases for the same publisher", () => {
    expect(publisherKey("www.espn.com")).toBe("espn");
    expect(publisherKey("site.api.espn.com")).toBe("espn");
    expect(publisherKey("www.bbc.co.uk")).toBe("bbc");
    expect(publisherKey("feeds.bbc.com")).toBe("bbc");
  });

  it("does not collapse unrelated publishers sharing a country suffix", () => {
    expect(publisherKey("www.soccerladuma.co.za")).toBe("soccerladuma.co.za");
    expect(publisherKey("www.kickoff.com")).toBe("kickoff.com");
  });

  it("canonicalises known publisher families and regional subdomains", () => {
    expect(publisherKey("english.ahram.org.eg")).toBe("ahram.org.eg");
    expect(publisherKey("data.uefa.com")).toBe("uefa");
  });
});
