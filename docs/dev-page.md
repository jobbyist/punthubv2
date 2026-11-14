# /dev: the MVP blueprint, team only

`puntr.co.za/dev` shows the current MVP blueprint behind an email + password gate.

- The repo is public, so the page content is committed only as ciphertext: `src/content/dev/blueprint.enc.json` (AES-256-GCM). The key is derived from the gate email + password with scrypt (N=2^17, r=8, 128 MiB per attempt). The server decrypts it only when the right pair is entered; a wrong pair fails the GCM tag check. No env vars are needed.
- After sign-in an httpOnly, SameSite=Strict cookie (`puntr_dev`, 12 hours) holds the derived key. "Sign out" deletes it. Changing the password invalidates every session.
- The page sends `X-Robots-Tag: noindex` and `Cache-Control: private, no-store`, has a noindex meta tag, is disallowed in `robots.txt`, and is in no nav or sitemap.
- Styles: `src/styles/dev-blueprint.css`, the blueprint's own stylesheet scoped under `.bp` (generated, light only).

## Updating the blueprint or changing the password

1. Export the new blueprint HTML.
2. Run, with the credentials in the environment (never on the command line history of a shared machine, never in the repo):
   `DEV_GATE_EMAIL=support@puntr.co.za DEV_GATE_PASSWORD='…' bun run dev:blueprint ./Puntr_MVP_Blueprint.html`
3. Commit both generated files. The script fails if the HTML has unbalanced tags (that breaks hydration); it repairs the known export glitch where the verdict, tiles and score wrappers lose their opening tags.

The password protects the content against anyone who reads the public repo, so use a long passphrase. A short password can be guessed offline, slowly.

## Readiness tab (14 Nov 2026)

The default tab is a live MVP readiness checklist with a weighted score out of 100.

- Catalogue (8 workstreams, weights adding to 100, tasks with weights and blocker flags): `src/lib/mvp-readiness.ts`. Edit it in a PR to add, reword or reweight tasks. The repo is public, so keep wording free of anything confidential.
- Manual tasks are ticked on the page by anyone signed in to /dev. Ticks are stored in `dev_readiness_state` (migration `20261114160000_dev_readiness_state.sql`; RLS on, no policies, service role only) and override the catalogue's `done` default. `setDevReadinessTask` re-checks the /dev session cookie before every write and only accepts task ids from the catalogue.
- Metric tasks are scored live in proportion to their target: Founding Members (100), Annual Passes taken (20), fixtures in the next 14 days (120), completed results incl. backfill (2,500), leagues with a table (12). A failed read scores 0 and shows "no data".
- Score = sum over workstreams of weight × (weighted task progress). Verdict: Launch ready (≥90 and no open blockers), On track (≥75), At risk (≥55), Not ready.
- If the migration is not applied, the tab shows catalogue defaults and ticking is disabled.
- The old encrypted blueprint (30 Oct) stays available under "Blueprint (archive)".
