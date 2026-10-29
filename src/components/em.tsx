import type { ReactNode } from "react";

/** Brand emphasis for key phrases inside translated text, e.g. <1>AI-Powered Insights</1> with <Trans components={{ 1: <Em /> }} />. */
export function Em({ children }: { children?: ReactNode }) {
  return <strong className="font-semibold text-primary">{children}</strong>;
}
