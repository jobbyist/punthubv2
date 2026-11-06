/**
 * Light and dark mode for Puntr emails. Relative imports only.
 * - Logo: two opaque PNGs (dark wordmark on white, light wordmark on dark). The light one shows by default; clients
 *   that honour prefers-color-scheme swap to the dark one. Because both images carry their own background, the logo
 *   stays readable in clients that force-invert colours (they leave images alone).
 * - Text and surfaces carry explicit colours plus dm-* classes that the dark stylesheet overrides.
 */
const SITE_URL = "https://puntr.co.za";

export const LOGO_LIGHT_URL = `${SITE_URL}/email/logo-light.png`;
export const LOGO_DARK_URL = `${SITE_URL}/email/logo-dark.png`;

export const DARK_CSS = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  .logo-dark { display:none; max-height:0; overflow:hidden; mso-hide:all; }
  @media (prefers-color-scheme: dark) {
    .dm-outer { background-color:#0b0f0e !important; }
    .dm-card { background-color:#151a18 !important; border-color:#2a3330 !important; }
    .dm-box { background-color:#1c2321 !important; border-color:#2a3330 !important; }
    .dm-line { border-color:#2a3330 !important; }
    .dm-h { color:#f3f4f6 !important; }
    .dm-p { color:#d1d5db !important; }
    .dm-sub { color:#9ca3af !important; }
    .dm-link { color:#86efac !important; }
    .dm-green { color:#4ade80 !important; border-color:#4ade80 !important; }
    .logo-light { display:none !important; max-height:0 !important; overflow:hidden !important; }
    .logo-dark { display:block !important; max-height:none !important; overflow:visible !important; }
  }
  [data-ogsc] .dm-h { color:#f3f4f6 !important; }
  [data-ogsc] .dm-p { color:#d1d5db !important; }
  [data-ogsc] .dm-sub { color:#9ca3af !important; }
  [data-ogsc] .dm-link { color:#86efac !important; }
  [data-ogsb] .dm-outer { background-color:#0b0f0e !important; }
  [data-ogsb] .dm-card { background-color:#151a18 !important; }
  [data-ogsb] .dm-box { background-color:#1c2321 !important; }
`;

/** The real Puntr logo, themed. Display size is half the file size so it stays sharp on high-density screens. */
export function themedLogo(widthPx = 104, heightPx = 56): string {
  const dims = `width="${widthPx}" height="${heightPx}" alt="Puntr" style="border:0;height:${heightPx}px;width:${widthPx}px;"`;
  return `<a href="${SITE_URL}" target="_blank" style="text-decoration:none;"><img class="logo-light" src="${LOGO_LIGHT_URL}" ${dims.replace('style="', 'style="display:block;')} /><img class="logo-dark" src="${LOGO_DARK_URL}" ${dims} /></a>`;
}
