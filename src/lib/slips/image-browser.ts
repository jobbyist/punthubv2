/**
 * Browser-only helpers for slip photos. The photo is redrawn onto a canvas and re-encoded as WebP, which drops
 * EXIF data (location, device) and shrinks it under the 5 MB bucket limit. Text is read on the device with
 * self-hosted tesseract.js (assets in /ocr); the image itself is never sent to an AI service.
 */

const MAX_EDGE = 1800;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function prepareSlipImage(file: File): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(file.type)) throw new Error("image_type");
  if (file.size > MAX_INPUT_BYTES) throw new Error("image_size");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("image_decode");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (blob && blob.size <= 5 * 1024 * 1024) return blob;
  }
  throw new Error("image_size");
}

/** Reads the slip's text on the device. Loads the OCR engine on first use (about 7 MB, then cached). */
export async function readSlipImage(
  image: Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
