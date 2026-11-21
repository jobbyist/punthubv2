import { createFileRoute } from "@tanstack/react-router";

import { RequireMember } from "@/components/account-gate";
import { useSession } from "@/components/session";
import { FoundingHqPage } from "@/components/admin/founding-hq";

export const Route = createFileRoute("/admin/founding-hq")({
  head: () => ({
    meta: [
      { title: "Founding HQ | Puntr Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FoundingHqRoute,
});

function FoundingHqRoute() {
  const { isAdmin } = useSession();

  return (
    <RequireMember>
      {() => (
        isAdmin ? (
          <FoundingHqPage />
        ) : (
          <main className="mx-auto max-w-xl px-4 py-20 text-center">
            <h1 className="text-2xl font-bold">Restricted workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Founding HQ is available to authorised Puntr administrators only.
            </p>
          </main>
        )
      )}
    </RequireMember>
  );
}
