import { createFileRoute, redirect } from "@tanstack/react-router";

/** League tables moved to /tables (15 Nov 2026). Old links keep working. */
export const Route = createFileRoute("/standings")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/tables${location.searchStr}`, statusCode: 301 });
  },
});
