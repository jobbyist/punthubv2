import { createServerFn } from "@tanstack/react-start";

export type PodcastSignupResult = { ok: true } | { ok: false; code: "unavailable" };

export const subscribeToPodcastPremiere = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const value = (typeof input === "object" && input !== null ? input : {}) as {
      email?: unknown;
      consent?: unknown;
      website?: unknown;
    };
    const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
    const spam = typeof value.website === "string" && value.website.trim().length > 0;
    if (
      !spam &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || value.consent !== true)
    )
      throw new Error("invalid");
    return { email, spam };
  })
  .handler(async ({ data }): Promise<PodcastSignupResult> => {
    if (data.spam) return { ok: true };
    if (Date.now() >= Date.parse("2026-12-01T07:00:00Z")) return { ok: false, code: "unavailable" };
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) return { ok: false, code: "unavailable" };
    const response = await fetch(
      `${url}/rest/v1/podcast_episode_notifications?on_conflict=email,episode_slug`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          email: data.email,
          episode_slug: "the-good-sport-episode-01",
          consented_at: new Date().toISOString(),
          source: "the-good-sport-premiere",
        }),
      },
    );
    if (!response.ok) {
      console.error("Podcast premiere signup failed", response.status, await response.text());
      return { ok: false, code: "unavailable" };
    }
    return { ok: true };
  });
