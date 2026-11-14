/**
 * Defence in depth for the archived /dev blueprint. The document is team-authored and AES-GCM
 * protected, so this is not the primary control; it makes sure that even a replaced or tampered
 * export can't run script in a team member's session. It removes active content only and keeps
 * the plain markup the page's copy buttons rely on (class names, data-target, ids).
 *
 * Server only (run before the HTML is sent to the browser).
 */

const BLOCK_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "style",
  "template",
  "noscript",
  "link",
  "meta",
  "base",
  "form",
];

export function sanitizeBlueprintHtml(html: string): string {
  let out = html;
  // Remove whole elements, including their content, then any stray opening or closing tags.
  for (const tag of BLOCK_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }
  // Inline event handlers: onclick="…", onload='…', onerror=…
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript:, vbscript: and data:text/html URLs in href, src, action, formaction, xlink:href.
  out = out.replace(
    /\s(href|src|action|formaction|xlink:href)\s*=\s*("|')?\s*(?:javascript|vbscript|data:text\/html)[^"'>\s]*\2?/gi,
    "",
  );
  // srcdoc can embed a whole document.
  out = out.replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return out;
}
