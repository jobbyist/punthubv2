/**
 * Launch notifications: wave dates, phone helpers and the WhatsApp/SMS wording. Relative imports only.
 *
 * Three waves of email to early-access people who have not signed up yet: launch day, +3 days, +7 days.
 * The WhatsApp and SMS message is never sent by the system. It goes to the admin panel for a person to send.
 */
export const SITE = "https://puntr.co.za";
export const DEFAULT_LAUNCH_DATE = "2026-11-02";
export const WAVE_OFFSETS = [0, 3, 7] as const;
export type Wave = 1 | 2 | 3;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The launch date from LAUNCH_DATE, or the default when it is missing or not a real date. */
export function launchDate(env?: string): string {
  const v = env?.trim();
  if (v && ISO_DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))) return v;
  return DEFAULT_LAUNCH_DATE;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function waveDates(launch: string): { wave: Wave; date: string }[] {
  return WAVE_OFFSETS.map((o, i) => ({ wave: (i + 1) as Wave, date: addDays(launch, o) }));
}

/** Which wave runs today (a SAST date), or null. */
export function waveFor(today: string, launch: string): Wave | null {
  return waveDates(launch).find((w) => w.date === today)?.wave ?? null;
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
      `${hi}it's Puntr. We're live! You asked for early access, so your Founding Member spot is reserved. ` +
      `Join free at ${SITE}/join with the email you gave us to get your numbered Founding badge and early-member perks. ` +
      `Puntr is for adults (18+). Gamble responsibly: helpline 0800 006 008.`,
    sms: `Puntr is live! Your free Founding Member spot is reserved: ${SITE}/join 18+. Helpline 0800 006 008`,
  };
}
