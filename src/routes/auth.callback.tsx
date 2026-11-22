import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AccountPage } from "@/components/account-gate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeNext } from "@/lib/email/auth-emails";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["code"] === "string" ? { code: search["code"].slice(0, 2048) } : {}),
    ...(typeof search["next"] === "string" ? { next: search["next"].slice(0, 200) } : {}),
    ...(typeof search["error_description"] === "string"
      ? { error_description: search["error_description"].slice(0, 240) }
      : {}),
  }),
  head: () => ({
    meta: [{ title: "Signing in | Puntr" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { code, next, error_description: errorDescription } = Route.useSearch();
  const [error, setError] = useState<string | null>(errorDescription ?? null);
  const started = useRef(false);
  const returnTo = safeNext(next, "/predictions");

  useEffect(() => {
    if (started.current || errorDescription) return;
    started.current = true;

    void (async () => {
      try {
        // Exchange the PKCE code when present. Also accept an existing session for
        // providers/configurations that return the session directly in the URL fragment.
        if (!code) {
          const { data: existing, error: existingError } = await supabase.auth.getSession();
          if (existingError) throw existingError;
          if (!existing.session) {
            await navigate({ to: "/join", search: { next: returnTo }, replace: true });
            return;
          }
        } else {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const session = data.session;
        if (!session?.user) throw new Error("No authenticated session was returned by Google.");

        // Existing members go straight to their requested destination. New OAuth users
        // continue through the existing profile/onboarding flow.
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("[Puntr] Could not check OAuth profile; returning to the requested page", profileError);
          await navigate({ to: returnTo as never, replace: true });
          return;
        }

        if (profile) {
          await navigate({ to: returnTo as never, replace: true });
        } else {
          await navigate({ to: "/join", search: { next: returnTo }, replace: true });
        }
      } catch (callbackError) {
        console.error("[Puntr] Google OAuth callback failed", callbackError);
        setError("We couldn't finish signing you in. Please return to Puntr and try Google sign-in again.");
      }
    })();
  }, [code, errorDescription, navigate, returnTo]);

  return (
    <AccountPage>
      <h1 className="text-2xl font-bold">Finishing your sign-in</h1>
      {error ? (
        <>
          <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>
          <Button asChild className="mt-5"><Link to="/join" search={{ next: returnTo }}>Return to Puntr sign in</Link></Button>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Verifying your session. You will be returned to where you started.</p>
      )}
    </AccountPage>
  );
}
