/**
 * Launch notifications: wave dates, phone helpers and the WhatsApp/SMS wording. Relative imports only.
 *
 * Two dates (owner decision, 5 Nov 2026): Founding Member sign-ups open on 2 Nov 2026 and the official platform launch
 * is 1 Dec 2026. The roadmap counts its weeks from the launch date. The early-access email waves count from the day
 * Founding sign-ups open: that day, +3 days, +7 days.
 * The WhatsApp and SMS message is never sent by the system. It goes to the admin panel for a person to send.
 */
export const SITE = "https://puntr.co.za";
export const DEFAULT_LAUNCH_DATE = "2026-12-01";
export const DEFAULT_SIGNUP_OPEN_DATE = "2026-11-02";
export const WAVE_OFFSETS = [0, 3, 7] as const;
export type Wave = 1 | 2 | 3;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(env: string | undefined, fallback: string): string {
  const v = env?.trim();
  if (v && ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))) return v;
  return fallback;
}

/** The official launch date from LAUNCH_DATE, or the default when it is missing or not a real date. */
export function launchDate(env?: string): string {
  return validDate(env, DEFAULT_LAUNCH_DATE);
}

/** The day Founding Member sign-ups open, from FOUNDING_OPEN_DATE, or the default. The email waves count from it. */
export function signupOpenDate(env?: string): string {
  return validDate(env, DEFAULT_SIGNUP_OPEN_DATE);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function waveDates(signupOpen: string): { wave: Wave; date: string }[] {
  return WAVE_OFFSETS.map((o, i) => ({ wave: (i + 1) as Wave, date: addDays(signupOpen, o) }));
}

/** Which wave runs today (a SAST date), or null. */
export function waveFor(today: string, signupOpen: string): Wave | null {
  return waveDates(signupOpen).find((w) => w.date === today)?.wave ?? null;
}

/** Lower-case, trimmed, and without a stray "www." typed in front of the address. */
export function cleanEmail(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

/** South African numbers only, as +27XXXXXXXXX. Anything else returns null and is left for a person to check. */
export function toE164ZA(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/[\s().-]/g, "");
  if (/^\+27[1-9]\d{8}$/.test(d)) return d;
  if (/^27[1-9]\d{8}$/.test(d)) return `+${d}`;
  if (/^0[1-9]\d{8}$/.test(d)) return `+27${d.slice(1)}`;
  return null;
}

export function whatsappLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace("+", "")}?text=${encodeURIComponent(text)}`;
}

export function smsLink(e164: string, text: string): string {
  return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** The drafts for the admin to send by hand. SMS stays short. No profit claims, 18+ and the helpline included. */
export function launchMessages(name?: string): { whatsapp: string; sms: string } {
  const hi = name ? `Hi ${firstName(name)}, ` : "Hi, ";
  return {
    whatsapp:
      `${hi}it's Puntr. Founding Member sign-ups are open! You asked for early access, so your spot is reserved. ` +
      `Join free at ${SITE}/join with the email you gave us to get your numbered Founding badge and early-member perks. ` +
      `Puntr launches on 1 December. ` +
      `Puntr is for adults (18+). Gamble responsibly: helpline 0800 006 008.`,
    sms: `Puntr Founding sign-ups are open! Your free spot is reserved: ${SITE}/join 18+. Helpline 0800 006 008`,
  };
}
