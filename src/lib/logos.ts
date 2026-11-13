/** Logo registry shared by the admin tab, the footer shuffler and the About page. */
export const LOGO_PLACEMENTS = ["footer", "about", "bookmakers", "homepage", "brand"] as const;
export type LogoPlacement = (typeof LOGO_PLACEMENTS)[number];
export const LOGO_KINDS = ["regulator", "payments", "partner", "brand"] as const;
export type LogoKind = (typeof LOGO_KINDS)[number];

export interface BrandLogo {
  id: string;
  code: string;
  name: string;
  kind: LogoKind;
  placements: LogoPlacement[];
  imageUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
}

/** Uploaded images are re-encoded in the browser; the server only accepts what that produces. */
export const LOGO_MAX_BYTES = 400 * 1024;
export const LOGO_MAX_EDGE = 480;

/** Reads the first bytes to confirm PNG, JPEG or WebP. SVG is refused on purpose (it can carry script). */
export function sniffImage(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "png";
  if (starts([0xff, 0xd8, 0xff])) return "jpeg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

/** Map a database row to the shared shape. */
export function toBrandLogo(r: Record<string, unknown>): BrandLogo {
  return {
    id: r["id"] as string,
    code: r["code"] as string,
    name: r["name"] as string,
    kind: r["kind"] as LogoKind,
    placements: ((r["placements"] as string[]) ?? []).filter((p): p is LogoPlacement =>
      (LOGO_PLACEMENTS as readonly string[]).includes(p),
    ),
    imageUrl: (r["image_url"] as string | null) ?? null,
    linkUrl: (r["link_url"] as string | null) ?? null,
    active: r["active"] === true,
    sortOrder: (r["sort_order"] as number) ?? 100,
  };
}
