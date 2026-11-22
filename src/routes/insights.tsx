import { createFileRoute, redirect } from "@tanstack/react-router";

/** Retired route: keep legacy bookmarks working without exposing the former Insights page. */
export const Route = createFileRoute("/insights")({
  beforeLoad: () => {
    throw redirect({ to: "/discover" });
  },
});
