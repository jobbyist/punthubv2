import { LOGO_MAX_BYTES, LOGO_MAX_EDGE } from "@/lib/logos";

/** Resizes (longest edge 480 px, never enlarged) and re-encodes to WebP in the browser; returns base64 without the prefix. */
export async function compressLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error("Use a PNG, JPEG or WebP image.");
  if (file.size > 8 * 1024 * 1024) throw new Error("That file is over 8 MB.");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not available in this browser.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  for (const q of [0.9, 0.8, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
    if (blob && blob.type === "image/webp" && blob.size <= LOGO_MAX_BYTES) return toBase64(blob);
  }
  throw new Error("Could not compress that image under 400 KB. Try a simpler or smaller file.");
}

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000)
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
