/**
 * Profile pictures: validated and compressed in the browser before upload, so storage only ever holds a small square.
 * Accepts JPG, PNG or WebP under 10 MB. Output: a 512 x 512 centre crop (smaller sources are not upscaled), WebP at
 * quality 0.86 where the browser supports it, otherwise JPEG at 0.88. Typically 30 to 120 KB.
 */
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const SIZE = 512;

export type AvatarCheck = { ok: true } | { ok: false; reason: "tooBig" | "badType" };

export function checkAvatarFile(file: { size: number; type: string }): AvatarCheck {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type))
    return { ok: false, reason: "badType" };
  if (file.size >= AVATAR_MAX_BYTES) return { ok: false, reason: "tooBig" };
  return { ok: true };
}

/** Square centre crop: the source rectangle to draw from, and the output edge (never upscaled). */
export function cropBox(width: number, height: number, max = SIZE) {
  const edge = Math.min(width, height);
  return {
    sx: Math.floor((width - edge) / 2),
    sy: Math.floor((height - edge) / 2),
    edge,
    out: Math.min(edge, max),
  };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressAvatar(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  // imageOrientation honours EXIF rotation from phone cameras.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { sx, sy, edge, out } = cropBox(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // White behind transparent PNGs, so a JPEG fallback has no black background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, out, out);
  bitmap.close();
  const webp = await toBlob(canvas, "image/webp", 0.86);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.88);
  if (!jpeg) throw new Error("encode_failed");
  return { blob: jpeg, ext: "jpg" };
}

/** Storage path inside the avatars bucket. The first folder must be the user's id (storage policy). */
export function avatarPath(userId: string, ext: string, now = Date.now()) {
  return `${userId}/avatar-${now}.${ext}`;
}

/** Path of a stored avatar from its public URL, or null if it is not one of ours. */
export function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}
