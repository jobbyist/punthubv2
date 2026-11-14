import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import {
  LANGUAGE_COOKIE,
  LANGUAGE_PREVIEW_COOKIE,
  resolveLocale,
  type LocaleCode,
} from "@/locales/config";

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Server-side language: cookie, then Accept-Language, then en-ZA.
 * The profile language (signed-in users) is applied on top of this by the session provider in P6.
 */
export const detectLocale = createServerFn({ method: "GET" }).handler(
  async (): Promise<LocaleCode> => {
    const req = getRequest();
    const cookies = req.headers.get("cookie");
    return resolveLocale({
      cookie: readCookie(cookies, LANGUAGE_COOKIE),
      acceptLanguage: req.headers.get("accept-language"),
      preview: readCookie(cookies, LANGUAGE_PREVIEW_COOKIE) === "1",
    });
  },
);

/** Runs in the browser: the cookie is the only source there (an explicit user choice). */
export function detectLocaleOnClient(): LocaleCode {
  const cookies = typeof document === "undefined" ? null : document.cookie;
  return resolveLocale({
    cookie: readCookie(cookies, LANGUAGE_COOKIE),
    acceptLanguage: typeof navigator === "undefined" ? null : navigator.language,
    preview: readCookie(cookies, LANGUAGE_PREVIEW_COOKIE) === "1",
  });
}

/** Persist an explicit choice. A language preference is a functional cookie the visitor asked for. */
export function writeLanguageCookie(code: LocaleCode, preview = false) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  // The preview flag lives only as long as the choice of a language in review; picking anything else clears it.
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = preview
    ? `${LANGUAGE_PREVIEW_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`
    : `${LANGUAGE_PREVIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
