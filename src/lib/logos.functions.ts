/** Admin > Logos/Branding: list, edit, upload (image checked on the server), activate. */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LOGO_KINDS,
  LOGO_MAX_BYTES,
  LOGO_PLACEMENTS,
  sniffImage,
  toBrandLogo,
  type BrandLogo,
  type LogoKind,
  type LogoPlacement,
} from "@/lib/logos";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; message: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function log(db: SupabaseClient, adminId: string, action: string, detail: object) {
  await db.from("admin_actions").insert({ admin_id: adminId, action, detail });
}

const FORBIDDEN: Fail = { ok: false, message: "Admin only." };

export const adminListLogos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandLogo[] | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const { data } = await db.from("brand_logos").select("*").order("sort_order").order("name");
    return ((data ?? []) as Record<string, unknown>[]).map(toBrandLogo);
  });

export interface SaveLogoInput {
  id?: string;
  name: string;
  kind: LogoKind;
  placements: LogoPlacement[];
  linkUrl: string;
  active: boolean;
  sortOrder: number;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const adminSaveLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as SaveLogoInput)
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    const name = data.name.trim();
    if (!name || name.length > 80)
      return { ok: false, message: "Enter a name (up to 80 characters)." };
    if (!LOGO_KINDS.includes(data.kind)) return { ok: false, message: "Unknown kind." };
    const placements = data.placements.filter((p) => LOGO_PLACEMENTS.includes(p));
    const link = data.linkUrl.trim();
    if (link && !/^https:\/\/[^\s]+$/.test(link))
      return { ok: false, message: "The link must start with https://" };
    const sortOrder = Number.isFinite(data.sortOrder) ? Math.trunc(data.sortOrder) : 100;
    const row = {
      name,
      kind: data.kind,
      placements,
      link_url: link || null,
      active: data.active,
      sort_order: sortOrder,
    };
    if (data.id) {
      const { error } = await db.from("brand_logos").update(row).eq("id", data.id);
      if (error) return { ok: false, message: error.message };
    } else {
      const code = slug(name) || `logo-${Date.now()}`;
      const { error } = await db.from("brand_logos").insert({ ...row, code });
      if (error)
        return {
          ok: false,
          message: error.code === "23505" ? "A logo with that name already exists." : error.message,
        };
    }
    await log(db, ctx.userId, "logo_saved", { id: data.id ?? null, name, active: data.active });
    return { ok: true };
  });

export interface UploadLogoInput {
  id: string;
  /** base64 of the PNG/JPEG/WebP the browser produced after resizing and compressing */
  base64: string;
}

export const adminUploadLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as UploadLogoInput)
  .handler(async ({ context, data }): Promise<{ ok: true; url: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    if (data.base64.length > Math.ceil((LOGO_MAX_BYTES * 4) / 3) + 8)
      return { ok: false, message: "Image is too large after compression." };
    const bytes = Uint8Array.from(Buffer.from(data.base64, "base64"));
    const type = sniffImage(bytes);
    if (!type || bytes.byteLength === 0 || bytes.byteLength > LOGO_MAX_BYTES)
      return { ok: false, message: "Upload a PNG, JPEG or WebP image (SVG is not accepted)." };
    const { data: row } = await db
      .from("brand_logos")
      .select("code")
      .eq("id", data.id)
      .maybeSingle();
    const code = (row as { code: string } | null)?.code;
    if (!code) return { ok: false, message: "Logo not found." };
    const ext = type === "jpeg" ? "jpg" : type;
    const path = `brand/${code}-${Date.now()}.${ext}`;
    const { error } = await db.storage
      .from("media")
      .upload(path, bytes, { contentType: `image/${type}`, cacheControl: "604800", upsert: false });
    if (error) return { ok: false, message: `Storage: ${error.message}` };
    const url = db.storage.from("media").getPublicUrl(path).data.publicUrl;
    const { error: upErr } = await db
      .from("brand_logos")
      .update({ image_url: url })
      .eq("id", data.id);
    if (upErr) return { ok: false, message: upErr.message };
    await log(db, ctx.userId, "logo_uploaded", { code, bytes: bytes.byteLength });
    return { ok: true, url };
  });

export const adminRemoveLogoImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { id: string })
  .handler(async ({ context, data }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    // Remove the image and deactivate in one update so nothing public points at a missing file.
    const { error } = await db
      .from("brand_logos")
      .update({ image_url: null, active: false })
      .eq("id", data.id);
    if (error) return { ok: false, message: error.message };
    await log(db, ctx.userId, "logo_image_removed", { id: data.id });
    return { ok: true };
  });
