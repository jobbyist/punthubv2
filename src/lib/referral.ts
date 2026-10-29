export const SITE = "https://puntr.co.za";

/** https://puntr.co.za/join?ref=<code>. The code is random and identifies no one. */
export function inviteUrl(code: string): string {
  return `${SITE}/join?ref=${encodeURIComponent(code)}`;
}

/** WhatsApp share link. Only the text you pass is sent, and it must never contain personal details. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function inviteText(code: string): string {
  return `Join me on Puntr, where every pick is locked at kick-off and kept on a public record. 18+. ${inviteUrl(code)}`;
}

export interface SharePick {
  /** "Pirates to win", "Over 2.5 goals", "Bulls -6.5". */
  label: string;
  odds: string;
  /** "3h 12m". */
  lockedBefore: string;
  fixtureId: string;
  code?: string | null | undefined;
}

/** "My pick: Pirates to win @ 2.10 - locked 3h 12m before kick-off on Puntr. puntr.co.za/match/<id>?ref=<code>" */
export function shareText(p: SharePick): string {
  const url = `puntr.co.za/match/${p.fixtureId}${p.code ? `?ref=${encodeURIComponent(p.code)}` : ""}`;
  return `My pick: ${p.label} @ ${p.odds} - locked ${p.lockedBefore} before kick-off on Puntr. ${url}`;
}
