/**
 * Supabase Auth "Send Email Hook": signature check (Standard Webhooks) and the mapping from the hook payload to the
 * branded emails in auth-emails.ts. Pure apart from Web Crypto, so it is unit-tested.
 */
import { AUTH_EMAIL_ACTIONS, type AuthEmailAction, type AuthEmailInput } from "./auth-emails";

const TOLERANCE_SECONDS = 5 * 60;

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Accepts the secret as shown in the Supabase dashboard ("v1,whsec_<base64>") or as "whsec_<base64>". */
export function parseHookSecret(secret: string): Uint8Array<ArrayBuffer> | null {
  const raw = secret
    .trim()
    .replace(/^v1,/, "")
    .replace(/^whsec_/, "");
  if (!raw) return null;
  try {
    const bytes = b64ToBytes(raw);
    return bytes.length >= 16 ? bytes : null;
  } catch {
    return null;
  }
}

export async function signHookPayload(
  secret: Uint8Array<ArrayBuffer>,
  id: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  return bytesToB64(sig);
}

export async function verifyHookSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const key = parseHookSecret(secret);
  if (!key || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  const expected = await signHookPayload(key, headers.id, headers.timestamp, body);
  return headers.signature
    .split(" ")
    .map((part) => part.split(","))
    .some(
      ([version, sig]) => version === "v1" && typeof sig === "string" && safeEqual(sig, expected),
    );
}

interface HookPayload {
  user?: { email?: string; new_email?: string };
  email_data?: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
    old_email?: string;
    provider?: string;
    factor_type?: string;
  };
}

/** Turns one hook call into the email(s) to send. Unknown actions return []. */
export function planAuthEmails(payload: unknown): AuthEmailInput[] {
  const p = (payload ?? {}) as HookPayload;
  const d = p.email_data ?? {};
  const action = d.email_action_type as AuthEmailAction | undefined;
  const email = p.user?.email?.trim();
  if (!action || !(AUTH_EMAIL_ACTIONS as readonly string[]).includes(action)) return [];
  const next = d.redirect_to || undefined;
  const base = { ...(next ? { next } : {}) };

  if (action === "email_change") {
    const newEmail = p.user?.new_email?.trim();
    const out: AuthEmailInput[] = [];
    const both = Boolean(d.token_hash_new && d.token_hash);
    // Supabase's names are reversed: token + token_hash_new go to the CURRENT address,
    // token_new + token_hash go to the NEW address.
    if (both && email) {
      out.push({
        action,
        to: email,
        ...(d.token ? { code: d.token } : {}),
        ...(d.token_hash_new ? { tokenHash: d.token_hash_new } : {}),
        verifyType: "email_change",
        ...(newEmail ? { otherEmail: newEmail } : {}),
        toNewAddress: false,
        ...base,
      });
    }
    if (newEmail) {
      const code = both ? d.token_new : d.token || d.token_new;
      out.push({
        action,
        to: newEmail,
        ...(code ? { code } : {}),
        ...(d.token_hash ? { tokenHash: d.token_hash } : {}),
        verifyType: "email_change",
        ...(email ? { otherEmail: email } : {}),
        toNewAddress: true,
        ...base,
      });
    }
    return out;
  }

  if (!email) return [];
  if (action.endsWith("_notification")) {
    const detail = d.provider || d.factor_type;
    return [
      {
        action,
        to: email,
        ...(d.old_email ? { otherEmail: d.old_email } : {}),
        ...(detail ? { detail } : {}),
      },
    ];
  }
  return [
    {
      action,
      to: email,
      ...(d.token ? { code: d.token } : {}),
      ...(d.token_hash ? { tokenHash: d.token_hash } : {}),
      verifyType: action,
      ...base,
    },
  ];
}
