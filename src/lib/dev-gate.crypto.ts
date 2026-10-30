import { scryptSync } from "node:crypto";

/**
 * Key derivation for the private /dev page. Server and build script only (node:crypto).
 * scrypt N=2^17, r=8 needs 128 MiB per attempt, which makes offline guessing against the
 * public ciphertext slow and expensive. A long passphrase is still the real protection.
 */
export const DEV_KDF = { name: "scrypt", N: 2 ** 17, r: 8, p: 1, keyLen: 32 } as const;

export function normaliseDevEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function deriveDevKey(email: string, password: string, salt: Buffer): Buffer {
  return scryptSync(`${normaliseDevEmail(email)}\n${password}`, salt, DEV_KDF.keyLen, {
    N: DEV_KDF.N,
    r: DEV_KDF.r,
    p: DEV_KDF.p,
    maxmem: 256 * 1024 * 1024,
  });
}
