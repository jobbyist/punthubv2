import { platforms } from "@/lib/mock-data";

export function AffiliateBanner({ label = "970 x 90" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary-soft/50 px-6 py-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">Affiliate banner / Promo space</p>
      <p className="text-xs text-muted-foreground/80">{label}</p>
    </div>
  );
}

export function PlatformRail() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {platforms.map((p) => (
        <div
          key={p.name}
          className="grid h-16 min-w-[130px] flex-1 place-items-center rounded-xl border border-border bg-card px-5 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <img src={p.logo} alt={p.name} className="h-8 w-auto object-contain" />
        </div>
      ))}
    </div>
  );
}
