import { describe, expect, it } from "vitest";

import { sniffImage, toBrandLogo } from "@/lib/logos";

describe("sniffImage", () => {
  it("recognises PNG, JPEG and WebP by their first bytes", () => {
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0]))).toBe("png");
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(
      sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("webp");
  });
  it("refuses SVG, HTML and empty input", () => {
    expect(sniffImage(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<html>"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("toBrandLogo", () => {
  it("drops unknown placements and defaults a missing image to null", () => {
    const l = toBrandLogo({
      id: "1",
      code: "x",
      name: "X",
      kind: "partner",
      placements: ["footer", "nope"],
      active: false,
    });
    expect(l.placements).toEqual(["footer"]);
    expect(l.imageUrl).toBeNull();
    expect(l.active).toBe(false);
  });
});
