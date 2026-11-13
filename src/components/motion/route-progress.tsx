import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/** Thin green loading bar at the top while a page (and its data) loads. */
export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (loading) {
      // Only show for loads longer than 120 ms, so instant navigations stay calm.
      const id = window.setTimeout(() => {
        setFinishing(false);
        setVisible(true);
      }, 120);
      return () => window.clearTimeout(id);
    }
    if (!visible) return;
    setFinishing(true);
    const id = window.setTimeout(() => {
      setVisible(false);
      setFinishing(false);
    }, 300);
    return () => window.clearTimeout(id);
  }, [loading, visible]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]" aria-hidden="true">
      <div
        className={`h-full bg-primary shadow-glow ${finishing ? "w-full transition-all duration-300" : "puntr-route-bar w-full"}`}
      />
    </div>
  );
}
