import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fixtures")({
  beforeLoad: () => {
    throw redirect({ to: "/predictions" });
  },
});
