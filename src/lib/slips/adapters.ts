/**
 * Bookmaker adapter registry: the seam for post-MVP integrations (share links, booking codes, partner APIs).
 *
 * Every source produces the same SlipDraft, which the member reviews before anything is saved, so adding an
 * integration means adding an adapter here and a server function that calls it; the tables already carry
 * `source = 'import'`, `import_provider` and `import_ref` (unique per member, so re-importing is a no-op).
 *
 * Rules for future adapters (see docs/BETTING_SLIPS.md): only for partners with status 'live' in
 * affiliate_partners and a written agreement that allows it; never send the member's personal details to a
 * partner; never attach PuntPoints or rewards to importing from a partner (Hollywoodbets terms); the member still
 * confirms every slip.
 */
import { parseSlipText, type SlipDraft } from "./parse";

export interface SlipAdapter {
  /** Stable id stored in bet_slips.import_provider. */
  id: string;
  label: string;
  /** Pasted text, OCR text or a share code that this adapter can read. */
  canRead(input: string): boolean;
  /** Turns the input into a draft. Implementations that fetch must run on the server. */
  read(input: string): Promise<{ draft: SlipDraft; importRef: string | null }>;
}

/** The pre-MVP adapter: deterministic parsing of text the member pasted or that OCR read from their photo. */
export const textAdapter: SlipAdapter = {
  id: "text",
  label: "Text",
  canRead: (input) => input.trim().length > 0,
  read: async (input) => ({ draft: parseSlipText(input), importRef: null }),
};

const registry: SlipAdapter[] = [textAdapter];

export function registerAdapter(adapter: SlipAdapter): void {
  if (registry.some((a) => a.id === adapter.id)) throw new Error(`adapter_exists:${adapter.id}`);
  // Specific adapters (share codes, links) are tried before the generic text parser.
  registry.unshift(adapter);
}

export function adapterFor(input: string): SlipAdapter | null {
  return registry.find((a) => a.canRead(input)) ?? null;
}

export function listAdapters(): readonly SlipAdapter[] {
  return registry;
}
