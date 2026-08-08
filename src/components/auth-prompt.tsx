import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

const STORAGE_KEY_LAST_PROMPT = "puntr:last-auth-prompt";
const STORAGE_KEY_FIRST_VISIT = "puntr:first-visit";
const DAYS_BETWEEN_PROMPTS = 7;

export function AuthPrompt() {
  const { isGuest, openEarlyAccess } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on homepage when user is NOT logged in
    if (pathname !== "/" || isGuest) {
      setShow(false);
      return;
    }

    // Check if we should show the prompt
    const shouldShowPrompt = () => {
      const now = Date.now();
      const firstVisit = localStorage.getItem(STORAGE_KEY_FIRST_VISIT);
      const lastPrompt = localStorage.getItem(STORAGE_KEY_LAST_PROMPT);

      // Set first visit if not set
      if (!firstVisit) {
        localStorage.setItem(STORAGE_KEY_FIRST_VISIT, now.toString());
        localStorage.setItem(STORAGE_KEY_LAST_PROMPT, now.toString());
        return true; // Show on first visit
      }

      // Check if 7 days have passed since last prompt
      if (lastPrompt) {
        const lastPromptTime = parseInt(lastPrompt, 10);
        const daysSinceLastPrompt = (now - lastPromptTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastPrompt >= DAYS_BETWEEN_PROMPTS) {
          localStorage.setItem(STORAGE_KEY_LAST_PROMPT, now.toString());
          return true;
        }
      }

      return false;
    };

    // Small delay to let the page load before showing prompt
    const timer = setTimeout(() => {
      if (shouldShowPrompt()) {
        setShow(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname, isGuest]);

  const handleDismiss = () => {
    setShow(false);
  };

  const handleSignup = () => {
    setShow(false);
    openEarlyAccess();
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-background p-6 shadow-lift sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-2xl"
          >
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-xl font-bold">Join Puntr Today</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign up for free to access predictions, earn PuntPoints, and get 30% recurring revenue from referrals.
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSignup} className="flex-1">
                Get started free
              </Button>
              <Button onClick={handleDismiss} variant="outline" className="flex-1">
                Maybe later
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
