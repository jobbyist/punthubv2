import { describe, expect, it } from "vitest";

import { buildDraftRequest, checkDraft, finalBody, salutationName } from "@/lib/endorsements";

const org = {
  name: "Example Board",
  kind: "regulator" as const,
  jurisdiction: "Gauteng",
  contactRole: "CEO",
  whatWeSeek: "Guidance",
  reasons: "Transparency",
};

describe("checkDraft", () => {
  it("flags banned wording and false endorsement claims", () => {
    expect(checkDraft("Hi", "Win money with our guaranteed tips").length).toBeGreaterThan(1);
    expect(checkDraft("Hi", "We are proudly endorsed by your board").length).toBe(1);
    expect(checkDraft("Hi", "Dear {{first_name}}, we would value your guidance.")).toEqual([]);
  });
});

describe("salutation and final body", () => {
  it("uses the first word of the contact name, else 'team'", () => {
    expect(salutationName("Thandi Mokoena")).toBe("Thandi");
    expect(salutationName("")).toBe("team");
    expect(salutationName("<script>")).toBe("team");
  });
  it("adds the signature and an opt-out line", () => {
    const t = finalBody("Dear {{first_name}},\nHello.", "Thandi Mokoena", "partners");
    expect(t).toContain("Dear Thandi,");
    expect(t).toContain("Puntr Partnerships");
    expect(t).toContain('reply "stop"');
  });
});

describe("buildDraftRequest", () => {
  it("never includes the contact's name and carries the fact sheet", () => {
    const r = buildDraftRequest({ ...org }, "outreach", "michael", "", []);
    expect(r.prompt).toContain("0800 006 008");
    expect(r.prompt).not.toContain("Thandi");
    expect(r.system).toContain("Dear {{first_name}},");
  });
  it("lists earlier subjects for a follow-up", () => {
    const r = buildDraftRequest(org, "follow_up", "partners", "", ["Intro to Puntr"]);
    expect(r.prompt).toContain("Intro to Puntr");
  });
});
