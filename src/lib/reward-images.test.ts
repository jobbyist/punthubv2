import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rewardImage } from "./reward-images";

describe("rewardImage", () => {
  it("maps the Good Sport merch codes to files that exist in /public", () => {
    for (const code of ["merch-cap", "merch-tee", "merch-socks", "merch-mug"]) {
      const src = rewardImage(code);
      expect(src).toMatch(/^\/rewards\/merch\/good-sport-/);
      expect(existsSync(join(process.cwd(), "public", src as string))).toBe(true);
    }
  });

  it("returns null for rewards without a photo", () => {
    expect(rewardImage("ott-r20")).toBeNull();
    expect(rewardImage(null)).toBeNull();
  });
});
