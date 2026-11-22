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
      { title: "Puntr Â· Dev" },
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

  if¶»§q«^