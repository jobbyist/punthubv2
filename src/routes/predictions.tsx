import { createFileRoute, redirect } from "@tanstack/react-router";

/** Preserve old bookmarks and shared links while moving the canonical hub to /discover. */
export const Route = createFileRoute("/predictions")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/discover", search: true });
  },
});
