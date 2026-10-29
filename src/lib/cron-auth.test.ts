import { afterEach, describe, expect, it } from "vitest";

import { checkCronAuth } from "./cron-auth.server";

const req = (auth?: string) =>
  new Request("https://puntr.co.za/api/cron/settle", {
    headers: auth ? { authorization: auth } : {},
  });

afterEach(() => {
  delete process.env["CRON_SECRET"];
});

describe("checkCronAuth", () => {
  it("refuses everything when no secret is configured", async () => {
    const res = checkCronAuth(req("Bearer anything"));
    expect(res?.status).toBe(503);
  });
  it("refuses a missing, wrong or malformed header", () => {
    process.env["CRON_SECRET"] = "s3cret-value";
    expect(checkCronAuth(req())?.status).toBe(401);
    expect(checkCronAuth(req("Bearer nope"))?.status).toBe(401);
    expect(checkCronAuth(req("s3cret-value"))?.status).toBe(401);
    expect(checkCronAuth(req("Bearer s3cret-valu"))?.status).toBe(401);
    expect(checkCronAuth(req("Bearer s3cret-value-and-more"))?.status).toBe(401);
  });
  it("accepts the exact bearer secret", () => {
    process.env["CRON_SECRET"] = "s3cret-value";
    expect(checkCronAuth(req("Bearer s3cret-value"))).toBeNull();
  });
});
