import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="Puntr home">
      <img src="/puntrlogo.png" alt="Puntr" className="h-8" />
    </Link>
  );
}
