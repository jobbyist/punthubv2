import { createFileRoute, Link } from "@tanstack/react-router";

import { ReadinessPanel } from "@/components/dev/readiness-panel";
import { getDevPage } from "@/lib/dev-gate.functions";

/**
 * Private MVP readiness workspace. Access is checked on the server against the signed-in Supabase admin role.
 * This route is intentionally noindex and is not included in public navigation or the sitemap.
 */
export const Route = createFileRoute("/dev")({
  loader: async () => {
    try {
      return await getDevPage();
    } catch {
      // Unauthenticated requests and invalid sessions get a simple access-denied page, not another login form.
      return { status: "forbidden" as const };
    }
  },
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
  const page = Route.useLoaderData();
  if (page.status === "forbidden") {
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
