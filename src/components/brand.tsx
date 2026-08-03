import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="PuntHub home">
      <span className="relative grid size-8 shrink-0 place-items-center rounded-full border-[2.5px] border-ink">
        <span className="size-2.5 rounded-full bg-primary" />
        <span className="absolute -right-0.5 top-1 h-1.5 w-2 rounded-full bg-background" />
      </span>
      <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
        punt<span className="text-primary">hub</span>
      </span>
    </Link>
  );
}
