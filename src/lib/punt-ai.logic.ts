export const PUNT_AI_MAX_MESSAGE_CHARS = 1_000;
export const PUNT_AI_LIVE_CREDIT_COST = 2;

export function normalizePuntAiQuestion(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").slice(0, PUNT_AI_MAX_MESSAGE_CHARS);
}

/** Live web is reserved for questions whose answer can materially change after Puntr's last data sync. */
export function needsPuntAiLiveWeb(value: string): boolean {
  return /\b(latest|today|right now|currently|current|live|tonight|tomorrow|this weekend|this week|breaking|news|injury|injured|suspension|transfer|line[- ]?up|starting eleven|weather|kick[- ]?off time|has .* started|what happened)\b/i.test(value);
}

export function isPuntAiOddsQuestion(value: string): boolean {
  return /\b(odds|bookmaker|betting line|price comparison|market price)\b/i.test(value);
}

export function containsPuntAiPrivateContext(value: string): boolean {
  return /\b(my (?:name|email|phone|address|account|password|id|balance|profile)|i live at|my personal|my bank|my medical)\b/i.test(value);
}

/** Strip likely personal identifiers before sending a prompt to an external model or search provider. */
export function scrubPuntAiMessage(value: string): string {
  return value
    .slice(0, PUNT_AI_MAX_MESSAGE_CHARS)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/(?:\+?27|0)\s?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, "[redacted phone]")
    .replace(/@[a-z0-9_]{2,30}\b/gi, "[redacted handle]")
    .replace(/\b\d{10,}\b/g, "[redacted number]")
    .replace(/https?:\/\/\S+/gi, "[link omitted]")
    .trim();
}
