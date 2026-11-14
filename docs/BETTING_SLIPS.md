# Betting slips

Members record slips they placed with a bookmaker, review them, and publish their legs as time-stamped Puntr picks.
Pre-MVP scope: manual entry, pasted text and photo upload. Post-MVP: bookmaker share links, booking codes and APIs.

## Flow

1. **Add.** Type it (empty form), paste text, or upload a photo (`/slips?tab=new`).
2. **Read.** Photo: re-encoded to WebP in the browser (EXIF and location dropped, at most 1800 px, under 5 MB), then
   read on the device by tesseract.js. The assets live in `public/ocr`, copied from `node_modules` by
   `scripts/copy-ocr-assets.mjs` before `dev` and `build`. The text is scrubbed (`scrubSlipText`) and sent to the
   `parseSlip` server function, which scrubs again, runs the deterministic parser (`parseSlipText`) and, only when
   that finds no legs, sends the scrubbed text to Gemini (Flash-Lite first, quota-guarded, 20 AI read attempts per
   member per 24 h, logged in `slip_parses` without text). Legs are matched to scheduled fixtures in the next 14 days
   with `resolveTeam` (both teams must resolve to exactly one fixture).
3. **Review.** The member checks bookmaker, stake, return, and every leg: Puntr fixture (or "not on Puntr"), market,
   selection, odds. `validateDraft` blocks saving on missing teams, bad odds or a market without a selection.
4. **Save / publish.** `saveSlipDraft` uploads the photo to `slips/{uid}/{uuid}.webp` (private bucket, owner-only
   policies), inserts the slip and legs under RLS, and sets `image_expires_at` to 30 days. `publish_slip` turns each
   leg with a fixture, market and selection into a pick through `create_prediction` (all or nothing: one failing leg,
   e.g. kick-off passed, rolls the publish back and the slip stays a draft). Other legs stay "tracked only".

## Data and rules

| Object | Notes |
|---|---|
| `bet_slips` | status draft/published/deleted; source manual/text/image/import; `import_provider` + `import_ref` unique per member for future imports; bookmaker, stake, total odds, return, `show_stake` (default off), note, image path/expiry |
| `bet_slip_legs` | fixture link, teams, market (1X2, OU25, BTTS, DC), selection, odds, the bookmaker's raw wording, `prediction_id` once published |
| `slip_parses` | AI-read attempts for the daily limit; no slip text |
| `bet_slips_before_update` | only `publish_slip` may publish; image path must be in the owner's folder; a published slip's bookmaker, stake, odds, return, type and source are frozen and it cannot return to draft |
| `slip_detail`, `slips_feed` | bookmaker shown to the owner only; stake/return to the owner or when `show_stake`; result from the latest settlement of each leg's pick: lost if any tracked leg lost, pending while any is open, partial when some legs are untracked, else won/void |
| Account deletion | drafts become deleted; bookmaker, stake, return and note cleared; photos expire immediately; parse log deleted; published picks stay (append-only record) |
| Limits | 20 published slips per member per day; 30 legs per slip; 20 AI reads per day; normal pick limits from `create_prediction` |
| Cron | `slip-images` 01:25 UTC (03:25 SAST): removes expired photos through the Storage API and clears the path |

Bookmaker names are display-only for the owner, never links or promotions, and never shown on public slips: affiliate
rules allow promotion only of `live` partners in `affiliate_partners`.

## Adding a bookmaker integration (post-MVP)

`src/lib/slips/adapters.ts` holds the adapter registry. An adapter reads a share code, link or API payload into the
same `SlipDraft`, so the review screen, validation, publishing and results need no change.

1. Implement `SlipAdapter` (`id`, `canRead`, `read` returning `{ draft, importRef }`) and `registerAdapter` it.
   Adapters that fetch run server-side only.
2. Save with `source = 'import'`, `import_provider = adapter.id`, `import_ref` = the bookmaker's slip id; the unique
   index makes re-imports a no-op.
3. Before shipping: the partner must be `live` in `affiliate_partners` with a written agreement that allows it; send
   no member personal data to the partner; attach no PuntPoints or rewards to importing from a partner (Hollywoodbets
   terms); keep the member's review step; update Privacy (new recipient) and the legal changelog.
