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
    if (!code || started.current || errorDescription) return;
    started.current = true;
    void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError("This sign-in link has expired or has already been used. Please try again.");
        return;
      }
      void navigate({ to: "/join", search: { next: returnTo } });
    });
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
