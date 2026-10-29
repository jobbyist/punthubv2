import { createFileRoute, redirect } from "@tanstack/react-router";

/** The CSV import now lives in the Fixtures tab of /admin. */
export const Route = createFileRoute("/admin/fixtures")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
