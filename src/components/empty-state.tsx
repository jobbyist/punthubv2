import type { ReactNode } from "react";

import { PageArt, type PageArtKind } from "@/components/motion/page-art";
import { cn } from "@/lib/utils";

/** Empty or not-yet-open state: one of the page motion graphics, a title, one line of help and an optional action. */
export function EmptyState({
  art,
  title,
  body,
  action,
  className,
}: {
  art: PageArtKind;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-surface relative isolate overflow-hidden px-5 py-10 text-center sm:px-8",
        className,
      )}
    >
      <div
        className="dot-grid absolute inset-0 -z-10 opacity-60"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 10%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <PageArt kind={art} className="mx-auto h-24 w-40" />
      <h2 className="mt-4 text-lg">{title}</h2>
      {body && (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
