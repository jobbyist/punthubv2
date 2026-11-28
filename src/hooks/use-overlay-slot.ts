import { useEffect, useState } from "react";

import {
  CONSENT_BANNER_ATTR,
  CONSENT_BANNER_EVENT,
  CONSENT_CHANGED_EVENT,
  hasCurrentConsent,
} from "@/lib/consent";

/** Space kept between a floating prompt and whatever sits below it. */
const GAP_PX = 12;
/** Fallback when no mobile dock is on screen (desktop, or the dock has slid away). */
const FALLBACK_BOTTOM = "calc(env(safe-area-inset-bottom, 0px) + 1rem)";
/** Short pause after the consent banner closes, so two prompts never swap in the same instant. */
const CONSENT_GRACE_MS = 1200;

function consentBannerOnScreen(): boolean {
  return document.documentElement.hasAttribute(CONSENT_BANNER_ATTR);
}

/**
 * True while the cookie consent banner is visible, or before this browser has made a choice under the current
 * notice (the banner mounts after other overlays, so "no choice yet" counts as "banner coming").
 * Starts true so nothing flashes during hydration.
 */
export function useConsentBannerPending(): boolean {
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let timer: number | undefined;
    const settle = (open: boolean) => {
      window.clearTimeout(timer);
      if (open) setPending(true);
      else timer = window.setTimeout(() => setPending(false), CONSENT_GRACE_MS);
    };
    if (!consentBannerOnScreen() && hasCurrentConsent()) setPending(false);

    const onBanner = (event: Event) =>
      settle((event as CustomEvent<{ open: boolean }>).detail?.open === true);
    const onChanged = () => settle(consentBannerOnScreen());
    window.addEventListener(CONSENT_BANNER_EVENT, onBanner);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(CONSENT_BANNER_EVENT, onBanner);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
    };
  }, []);

  return pending;
}

function readDock(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-mobile-dock]");
}

/** Something modal is open (a Radix dialog or sheet locks scrolling) or the mobile dock flyout is up. */
function somethingModalOpen(): boolean {
  return (
    document.body.hasAttribute("data-scroll-locked") ||
    document.querySelector('[data-dock-flyout="open"]') !== null
  );
}

function computeBottom(): string {
  const dock = readDock();
  if (!dock || dock.dataset["mobileDock"] !== "shown") return FALLBACK_BOTTOM;
  const rect = dock.getBoundingClientRect();
  // lg:hidden gives the dock no box on desktop.
  if (rect.height === 0) return FALLBACK_BOTTOM;
  const fromBottom = window.innerHeight - rect.top + GAP_PX;
  return `${Math.max(16, Math.round(fromBottom))}px`;
}

/**
 * Where a bottom-anchored prompt may sit without covering other UI: just above the mobile dock (following it as it
 * slides in and out), and hidden while a dialog, sheet or the dock flyout is open.
 */
export function useOverlaySlot(enabled: boolean): { bottom: string; blocked: boolean } {
  const [bottom, setBottom] = useState(FALLBACK_BOTTOM);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setBottom(computeBottom());
        setBlocked(somethingModalOpen());
      });
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-scroll-locked", "data-mobile-dock", "data-dock-flyout"],
    });
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target instanceof HTMLElement && event.target.hasAttribute("data-mobile-dock"))
        update();
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    document.addEventListener("transitionend", onTransitionEnd, true);
    // The dock can mount, unmount or change height (guest Founding row) without any attribute change.
    const poll = window.setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      document.removeEventListener("transitionend", onTransitionEnd, true);
    };
  }, [enabled]);

  return { bottom, blocked };
}
