import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

/**
 * Wraps premium content. Guests see a frosted-glass gate over blurred content.
 */
export function Locked({
  children,
  label = "Create a free account to unlock today's predictions.",
  intensity = "md",
  compact = false,
}: {
  children: ReactNode;
  label?: string;
  intensity?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const { openEarlyAccess } = useSession();
  const blur = intensity === "sm" ? "blur-[3px]" : intensity === "lg" ? "blur-[10px]" : "blur-[6px]";

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className={`pointer-events-none select-none ${blur}`} aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-background/55 p-4 text-center backdrop-blur-[2px]">
        <div className="max-w-xs">
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary-soft text-primary">
            <Lock className="size-4" />
          </span>
          <p className={`mt-3 font-medium ${compact ? "text-xs" : "text-sm"}`}>{label}</p>
          <Button size={compact ? "sm" : "default"} className="mt-3" onClick={() => openEarlyAccess(label)}>
            Create free account
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GateValue({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { isGuest, openEarlyAccess } = useSession();
  if (!isGuest) return <span className={className}>{children}</span>;
  return (
    <button
      onClick={() => openEarlyAccess("Create a free account to see live odds and AI confidence.")}
      className={`select-none blur-[5px] transition hover:blur-[4px] ${className}`}
      aria-label="Locked — create a free account to view"
    >
      {children}
    </button>
  );
}
