/** Endorsement tracker: shared types, the Gemini prompt (no personal data), and deterministic checks on a draft. */
export const ENDORSEMENT_STATUSES = [
  "prospect",
  "drafted",
  "contacted",
  "follow_up_due",
  "in_discussion",
  "endorsed",
  "declined",
  "no_response",
  "paused",
] as const;
export type EndorsementStatus = (typeof ENDORSEMENT_STATUSES)[number];
export const ENDORSEMENT_KINDS = [
  "regulator",
  "foundation",
  "industry_body",
  "partner",
  "media",
  "other",
] as const;
export type EndorsementKind = (typeof ENDORSEMENT_KINDS)[number];
export type EmailKind = "outreach" | "follow_up";
export type SenderKey = "michael" | "partners";

export const SENDERS: Record<SenderKey, { from: string; address: string; signoff: string }> = {
  michael: {
    from: "Michael from Puntr <michael@puntr.co.za>",
    address: "michael@puntr.co.za",
    signoff: "Michael Chigbu\nFounder, Puntr (Pty) Ltd\npuntr.co.za",
  },
  partners: {
    from: "Puntr Partners <partners@puntr.co.za>",
    address: "partners@puntr.co.za",
    signoff: "The Puntr Partnerships team\nPuntr (Pty) Ltd\npuntr.co.za",
  },
};

export interface EndorsementOrg {
  id: string;
  name: string;
  kind: EndorsementKind;
  jurisdiction: string;
  website: string | null;
  contactName: string;
  contactRole: string;
  contactEmail: string | null;
  status: EndorsementStatus;
  whatWeSeek: string;
  reasons: string;
  notes: string;
  doNotContact: boolean;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
}

export interface EndorsementEmail {
  id: string;
  orgId: string;
  kind: EmailKind;
  sender: SenderKey;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  model: string | null;
  toEmail: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface EndorsementEvent {
  id: string;
  orgId: string;
  kind: string;
  detail: string;
  createdAt: string;
}

/** Words the brand rules forbid anywhere (CLAUDE.md copy rules). */
const BANNED = [
  /\bguarantee[sd]?\b/i,
  /\bsure (?:win|thing|bet)/i,
  /\bearn more\b/i,
  /\bwin money\b/i,
  /\bvalue bet\b/i,
  /#1\b/,
];
/** A draft must not claim an endorsement or relationship that does not exist. */
const FALSE_CLAIMS = [
  /\bendorsed by\b/i,
  /\b(?:approved|licensed|accredited|certified|regulated) by\b/i,
  /\bofficial partner\b/i,
  /\bin partnership with\b/i,
];

export function checkDraft(subject: string, body: string): string[] {
  const text = `${subject}\n${body}`;
  const problems: string[] = [];
  for (const re of BANNED) if (re.test(text)) problems.push(`Banned wording: ${re.source}`);
  for (const re of FALSE_CLAIMS)
    if (re.test(text))
      problems.push(`Possible claim of an endorsement or relationship: ${re.source}`);
  if (/\{\{|\}\}|\[[A-Z][a-z]+ [a-z]+\]/.test(text) && !/\{\{first_name\}\}/.test(text))
    problems.push("Contains an unfilled placeholder.");
  return problems;
}

export const FACT_SHEET = [
  "Puntr (puntr.co.za) is a free South African sports prediction community and intelligence platform. It is not a bookmaker and does not take bets.",
  "Official launch: Tuesday 1 December 2026. Founding Member sign-ups opened 2 November 2026. Football (soccer) only at launch, with more sports on a published roadmap.",
  "18+ only. The responsible-gambling notice and the national helpline 0800 006 008 appear on every page.",
  "No cash prizes, no cash referrals and no odds comparison at launch. Rewards (PuntPoints) are loyalty points redeemable only for vouchers and perks, never cash.",
  "Affiliate links, if any, appear only for licensed operators after a recorded licence check, always labelled as ads.",
  "Personal information is handled under POPIA; no trackers before consent.",
];

/** The model sees organisation facts and Puntr's fact sheet only: no member data and no contact person's name. */
export function buildDraftRequest(
  org: Pick<
    EndorsementOrg,
    "name" | "kind" | "jurisdiction" | "contactRole" | "whatWeSeek" | "reasons"
  >,
  kind: EmailKind,
  sender: SenderKey,
  extra: string,
  previousSubjects: string[],
) {
  const system = [
    "You write short, honest, professional emails from a South African start-up founder to an organisation, asking for guidance or an endorsement.",
    "Rules: plain text, 120 to 190 words, South African English spelling. Open with exactly 'Dear {{first_name}},'. No hype, no flattery, no urgency tricks.",
    "Never claim that the organisation already endorses, approves, licenses, certifies or partners with Puntr. Never promise profit, winnings or guaranteed outcomes.",
    "Use only the facts supplied. Do not invent statistics, meetings, names or dates. One clear ask. Offer a short call or to send the platform for review. Do not add a signature block; it is added later.",
    'Return JSON {"subject": string, "body": string}.',
  ].join("\n");
  const prompt = [
    `Email type: ${kind === "outreach" ? "first outreach" : "polite follow-up to an earlier email that has had no reply"}.`,
    kind === "follow_up" && previousSubjects.length
      ? `Earlier subject lines (do not repeat): ${previousSubjects.join(" | ")}`
      : "",
    `Sender voice: ${sender === "michael" ? "Michael, the founder, first person ('I')" : "the Puntr Partnerships team, first person plural ('we')"}.`,
    `Organisation: ${org.name} (${org.kind.replace("_", " ")}${org.jurisdiction ? `, ${org.jurisdiction}` : ""}).`,
    org.contactRole ? `Recipient's role: ${org.contactRole}.` : "",
    org.whatWeSeek ? `What Puntr is asking for: ${org.whatWeSeek}` : "",
    org.reasons ? `Why this organisation: ${org.reasons}` : "",
    extra ? `Extra instruction from the founder: ${extra.slice(0, 400)}` : "",
    "Puntr facts you may use:",
    ...FACT_SHEET.map((f) => `- ${f}`),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    system,
    prompt,
    schema: {
      type: "OBJECT",
      properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
      required: ["subject", "body"],
    },
    temperature: 0.4,
    maxOutputTokens: 700,
  };
}

/** First name for the salutation: the first word of the contact name, or a neutral fallback. */
export function salutationName(contactName: string): string {
  const first = contactName.trim().split(/\s+/)[0] ?? "";
  return first && /^[\p{L}'-]{1,40}$/u.test(first) ? first : "team";
}

/** Final text sent: salutation filled in, signature and opt-out line added. */
export function finalBody(body: string, contactName: string, sender: SenderKey): string {
  const filled = body.replace(/\{\{first_name\}\}/g, salutationName(contactName)).trim();
  return `${filled}\n\nKind regards,\n${SENDERS[sender].signoff}\n\nIf you would rather not hear from us again, reply "stop" and we will not contact you again.`;
}

export function toHtml(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0D0D0D">${esc
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}
