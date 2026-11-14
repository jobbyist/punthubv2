/**
 * Wording for /privacy/request. English is the version that applies; the Afrikaans set is its translation.
 * Kept together so a change to one is easy to mirror in the other (Admin > Translations marks the review
 * stale when this file or the route changes).
 */
export interface PrivacyRequestCopy {
  title: string;
  subtitle: string;
  kinds: [string, string][];
  tooMany: string;
  failed: string;
  done: (email: string) => string;
  email: string;
  kind: string;
  details: string;
  sending: string;
  send: string;
  fine: string;
}

export const privacyRequestEn: PrivacyRequestCopy = {
  title: "Privacy request",
  subtitle: "We aim to reply within 30 days.",
  kinds: [
    ["access", "Send me a copy of my information"],
    ["correction", "Correct my information"],
    ["deletion", "Delete my information"],
    ["objection", "Stop using my information for something"],
    ["complaint", "I have a complaint"],
  ],
  tooMany: "Too many requests today. Please try again tomorrow.",
  failed: "Could not send your request. Check the email address and try again.",
  done: (email) =>
    `Request received. We will reply to ${email}. For anything urgent write to privacy@puntr.co.za.`,
  email: "Email you used with Puntr",
  kind: "What do you need?",
  details: "Details (optional)",
  sending: "Sending…",
  send: "Send request",
  fine: "18+ only. Gambling helpline: 0800 006 008.",
};

export const privacyRequestAf: PrivacyRequestCopy = {
  title: "Privaatheidsversoek",
  subtitle: "Ons poog om binne 30 dae te antwoord.",
  kinds: [
    ["access", "Stuur vir my 'n afskrif van my inligting"],
    ["correction", "Stel my inligting reg"],
    ["deletion", "Skrap my inligting"],
    ["objection", "Hou op om my inligting vir iets te gebruik"],
    ["complaint", "Ek het 'n klagte"],
  ],
  tooMany: "Te veel versoeke vandag. Probeer asseblief môre weer.",
  failed: "Kon nie jou versoek stuur nie. Kontroleer die e-posadres en probeer weer.",
  done: (email) =>
    `Versoek ontvang. Ons sal na ${email} antwoord. Skryf vir enigiets dringends aan privacy@puntr.co.za.`,
  email: "E-pos wat jy by Puntr gebruik het",
  kind: "Wat het jy nodig?",
  details: "Besonderhede (opsioneel)",
  sending: "Stuur tans…",
  send: "Stuur versoek",
  fine: "Slegs 18+. Dobbelhulplyn: 0800 006 008.",
};
