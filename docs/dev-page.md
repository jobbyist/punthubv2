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
