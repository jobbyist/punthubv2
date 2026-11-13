import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { toBrandLogo, type BrandLogo, type LogoPlacement } from "@/lib/logos";

let cache: Promise<BrandLogo[]> | null = null;

/** Drop the shared copy so the next hook mount refetches (called after an admin change). */
export function resetBrandLogos() {
  cache = null;
}

/** Active, uploaded logos for one placement. Public read (RLS); fetched once per page load and shared. */
export function useBrandLogos(placement: LogoPlacement): BrandLogo[] {
  const [logos, setLogos] = useState<BrandLogo[]>([]);
  useEffect(() => {
    let live = true;
    cache ??= Promise.resolve(
      supabase.from("brand_logos").select("*").order("sort_order").order("name"),
    ).then(({ data }) => ((data ?? []) as Record<string, unknown>[]).map(toBrandLogo));
    cache
      .then((all) => live && setLogos(all.filter((l) => l.placements.includes(placement))))
      .catch(() => {
        cache = null;
      });
    return () => {
      live = false;
    };
  }, [placement]);
  return logos;
}
