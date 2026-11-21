import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { ReadinessPanel } from "@/components/dev/readiness-panel";
import { useSession } from "@/components/session";
import { getDevPage, type DevPageData } from "@/lib/dev-gate.functions";

/**
 * Private MVP readiness workspace. Access is checked against the signed-in Supabase admin role.
 * The data request runs client-side after session hydration so the existing auth-attacher can pass the bearer token.
 */
export const Route = createFileRoute("/dev")({
  staleTime: 0,
  head: () => ({
    meta: [
      { title: "Puntr · Dev" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "googlebot", content: "noindex, nofollow" },
    ],
  }),
  component: DevPage,
});

function DevPage() {
  const { loading, user, isAdmin } = useSession();
  const loadPage = useServerFn(getDevPage);
  const [page, setPage] = useState<DevPageData | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      setPage({ status: "forbidden" });
      return;
    }
    let active = true;
    setPage(null);
    void loadPage()
      .then((result) => {
        if (active) setPage(result);
      })
      .catch(() => {
        if (active) setPage({ status: "forbidden" });
      });
    return () => {
      active = false;
    };
  }, [loading, user?.id, isAdmin, loadPage]);

  if (loading || (user && isAdmin && !page)) {
    return (
      <main className="mx-auto flex min-h-[65vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Checking administrator access…</p>
      </main>
    );
  }

  if (!page || page.status === "forbidden") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Puntr · Internal</p>
        <h1 className="mt-3 text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Sign in to Puntr with an administrator account, then open this page again.
        </p>
        <Link
          to="/join"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Puntr / Internal workspace
          </p>
          <h1 className="text-lg font-semibold">MVP readiness</h1>
        </div>
        <Link to="/admin" className="text-sm font-semibold text-primary hover:underline">
          Back to Admin
        </Link>
      </div>
      <ReadinessPanel snapshot={page.readiness} />
    </div>
  );
}
