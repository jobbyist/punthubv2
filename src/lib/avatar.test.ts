import { describe, expect, it } from "vitest";

import {
  AVATAR_MAX_BYTES,
  avatarPath,
  checkAvatarFile,
  cropBox,
  pathFromPublicUrl,
} from "./avatar";

describe("avatar", () => {
  it("accepts images under 10 MB and refuses 10 MB or more", () => {
    expect(checkAvatarFile({ size: AVATAR_MAX_BYTES - 1, type: "image/jpeg" })).toEqual({
      ok: true,
    });
    expect(checkAvatarFile({ size: AVATAR_MAX_BYTES, type: "image/png" })).toEqual({
      ok: false,
      reason: "tooBig",
    });
  });
  it("refuses other types", () => {
    expect(checkAvatarFile({ size: 10, type: "image/gif" })).toEqual({
      ok: false,
      reason: "badType",
    });
    expect(checkAvatarFile({ size: 10, type: "image/heic" })).toEqual({
      ok: false,
      reason: "badType",
    });
  });
  it("centre-crops to a square and never upscales", () => {
    expect(cropBox(4000, 3000)).toEqual({ sx: 500, sy: 0, edge: 3000, out: 512 });
    expect(cropBox(200, 300)).toEqual({ sx: 0, sy: 50, edge: 200, out: 200 });
  });
  it("builds paths in the user's folder and reads them back from public URLs", () => {
    expect(avatarPath("u1", "webp", 5)).toBe("u1/avatar-5.webp");
    expect(
      pathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar-5.webp"),
    ).toBe("u1/avatar-5.webp");
    expect(pathFromPublicUrl("https://example.com/a.png")).toBeNull();
  });
});
