import { buildEmail } from "./founding-shared";

/**
 * Renders an outbox message (written by an admin in /admin > Users) in the shared Puntr layout. Plain text in, so
 * nothing an admin types becomes HTML: blank lines split paragraphs, and the builder escapes every paragraph.
 */
export function outboxEmail(subject: string, body: string): { html: string; text: string } {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const built = buildEmail({
    subject,
    preheader: paragraphs[0]?.slice(0, 120) ?? subject,
    heading: subject,
    greeting: "Hi,",
    paragraphs,
    sign: ["The Puntr team", "puntr.co.za"],
    reason: "You are receiving this because you have a Puntr account.",
  });
  return { html: built.html, text: built.text };
}
