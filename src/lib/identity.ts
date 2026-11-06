/** Identity verification (manual, phase 1). Pure helpers, testable without a browser or database. */
export const ID_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const ID_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type IdDocCheck = { ok: true } | { ok: false; reason: "tooBig" | "badType" };

export function checkIdDocument(file: { size: number; type: string }): IdDocCheck {
  if (!(ID_DOC_TYPES as readonly string[]).includes(file.type))
    return { ok: false, reason: "badType" };
  if (file.size >= ID_DOC_MAX_BYTES) return { ok: false, reason: "tooBig" };
  return { ok: true };
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Random file name in the member's own folder: nothing personal in the path. */
export function idDocumentPath(userId: string, type: string, random: string): string {
  return `${userId}/${random}.${EXT[type] ?? "bin"}`;
}
