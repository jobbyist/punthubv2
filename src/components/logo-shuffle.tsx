import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import type { BrandLogo } from "@/lib/logos";

const SLOTS = 6;

function Tile({ logo }: { logo: BrandLogo }) {
  const img = (
    <img
      src={logo.imageUrl ?? ""}
      alt={logo.name}
      loading="lazy"
      className="max-h-10 max-w-[7.5rem] object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
    />
  );
  return logo.linkUrl ? (
    <a
      href={logo.linkUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={logo.name}
    >
      {img}
    </a>
  ) : (
    img
  );
}

/**
 * Footer logo shuffler: a row of slots where one slot at a time swaps to the next logo in the pool.
 * Reduced motion shows every logo in a static wrap. Only active logos with an uploaded image appear for the public;
 * admins also see dashed placeholders for the ones still waiting for an upload or activation.
 */
export function LogoShuffle() {
  const { t } = useTranslation("nav");
  const { isAdmin } = useSession();
  const logos = useBrandLogos("footer");
  const reduce = useReducedMotion();
  const [slots, setSlots] = useState<number[]>([]);
  const next = useRef(SLOTS);
  const turn = useRef(0);

  const live = logos.filter((l) => l.active && l.imageUrl);
  const pending = isAdmin ? logos.filter((l) => !(l.active && l.imageUrl)) : [];
  const count = live.length;

  useEffect(() => {
    setSlots(Array.from({ length: Math.min(SLOTS, count) }, (_, i) => i));
    next.current = Math.min(SLOTS, count);
    turn.current = 0;
  }, [count]);

  useEffect(() => {
    if (reduce || count <= SLOTS) return;
    const id = setInterval(() => {
      const slot = turn.current++ % SLOTS;
      const logo = next.current++ % count;
      setSlots((cur) => cur.map((v, i) => (i === slot ? logo : v)));
    }, 2600);
    return () => clearInterval(id);
  }, [reduce, count]);

  if (!count && !pending.length) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-8 sm:px-6">
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("footer.partnersLabel")}
      </p>
      {count > 0 && (
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {reduce || count <= SLOTS
            ? live.map((l) => (
                <li key={l.id} className="grid h-12 place-items-center">
                  <Tile logo={l} />
                </li>
              ))
            : slots.map((idx, slot) => {
                const l = live[idx];
                return (
                  <li
                    key={slot}
                    className="relative grid h-12 w-32 place-items-center overflow-hidden"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {l && (
                        <motion.div
                          key={l.id}
                          initial={{ y: 28, opacity: 0, rotateX: -60 }}
                          animate={{ y: 0, opacity: 1, rotateX: 0 }}
                          exit={{ y: -28, opacity: 0, rotateX: 60 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="grid place-items-center"
                        >
                          <Tile logo={l} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
        </ul>
      )}
      {pending.length > 0 && (
        <ul
          className="mt-4 flex flex-wrap justify-center gap-2"
          aria-label={t("footer.partnersPending")}
        >
          {pending.map((l) => (
            <li
              key={l.id}
              className="border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground"
            >
              {l.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
