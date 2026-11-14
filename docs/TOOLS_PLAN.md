# /tools: path to live by 1 December 2026

Owner brief (14 Nov 2026): every tool on `/tools` ships in the live MVP, and in Practice Mode 2.0 where it makes
sense, before launch. Status today: all three are "Coming soon" on the page (copy is honest about it).

| Tool | Free / Pro | What "live" means | Practice Mode 2.0 |
| --- | --- | --- | --- |
| Betting Slip Converter | Free | Paste slip text or a bookmaker share code, or upload a screenshot; matched legs become draft Puntr picks on known fixtures; open the analytics sheet and community split for each; lock in before kick-off | Converts into practice picks on the fictional league (demo slips) |
| AI "Edge Finder" cards | Pro (R99) | One card per fixture: form, goals per game, head to head, community split, a short Gemini-written summary of those numbers only (no invented stats, no "value" language) | Demo cards on practice fixtures, paid with demo credits |
| Punt AI v1.0 | Pro (R99) | Chat grounded in Puntr data for one fixture or competition (fixtures, results, form, community picks); refuses tips framed as certainty; daily quota per member | Demo chat on practice fixtures |

## Order and dependencies
1. Slip Converter first (free; drives picks and sign-ups). Text paste + share-code parsing per bookmaker
   (Hollywoodbets, Betway, Supabets, Playbet, Yesplay): deterministic parsers, fuzzy fixture matching against
   `fixtures`, then the existing pick flow. Screenshot upload second.
2. Edge Finder cards reuse `src/lib/match/form.ts`, the analytics sheet and the content-engine Gemini router
   (Flash-Lite, quota guard). Cache one card per fixture per day.
3. Punt AI on the same router with retrieval from Puntr tables only; per-member daily cap via `api_quota_claim`.

## Must decide / check before building
- **POPIA:** a slip screenshot can show the member's name, account number or balance. Owner rule: no personal data
  to any AI service. Options: (a) text/share-code only at launch, (b) on-device OCR (e.g. Tesseract in the browser)
  then send only the parsed legs, never the image. Recommendation: (a) for 1 Dec, (b) after.
- **Affiliates:** converted slips must not show bookmaker branding or links unless the partner is `live` and the
  creative is approved (Hollywoodbets 2.10).
- **Pro billing:** Edge Finder and Punt AI need PayFast Pro live (owner go-ahead pending).
- **Copy:** cards and chat never say "value bet", "sure", "guaranteed"; every AI output carries the AI label.
