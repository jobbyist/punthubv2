import { createFileRoute, redirect } from "@tanstack/react-router";

/** The community feed moved to /forum (15 Nov 2026). Old links and search results keep working. */
export const Route = createFileRoute("/community")({
  beforeLoad: () => {
    throw redirect({ to: "/forum", statusCode: 301 });
  },
});
