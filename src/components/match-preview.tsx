import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Lock, ArrowRight } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { useSession } from "@/components/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "home", label: "Orlando Pirates", share: 62 },
  { key: "draw", label: null, share: 22 },
  { key: "away", label: "Kaizer Chiefs", share: 16 },
] as const;

/** Illustrative only. Guest selections prompt sign-up; nothing in this preview is stored. */
export function MatchPreview() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const { isSignedIn, loading } = useSession();
  const [picked, setPicked] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  const handlePick = (key: string) => {
    if (!loading && !isSignedIn) {
      setSignupOpen(true);
      return;
    }
    setPicked(key);
  };

  return (
    <>
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2 className="text-lg">{t("preview.title")}</h2>
          <span className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("preview.badge")}
          </span>
        </div>
        <div className="border-t border-border px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <TeamLogo team="Orlando Pirates" size="lg" />
              <span className="truncate text-sm font-semibold sm:text-base">Orlando Pirates</span>
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
              {tc("vs").toUpperCase()}
            </span>
            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <span className="truncate text-right text-sm font-semibold sm:text-base">
                Kaizer Chiefs
              </span>
              <TeamLogo team="Kaizer Chiefs" size="lg" />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("preview.fixture")}</p>

          <p className="mt-5 text-sm font-semibold">{t("preview.try")}</p>
          <div className="mt-2 space-y-2">
            {OPTIONS.map((o) => {
              const active = picked === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => handlePick(o.key)}
                  aria-pressed={active}
                  className={cn(
                    "relative min-h-12 w-full overflow-hidden border px-3 py-3 text-left text-sm transition-colors touch-manipulation",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <motion.span
                    aria-hidden
                    initial={{ width: 0 }}
                    animate={{ width: `${o.share}%` }}
                    transition={{ duration: 0.9, delay: 0.2 }}
                    className={cn(
                      "absolute inset-y-0 left-0",
                      active ? "bg-primary/15" : "bg-muted",
                    )}
                  />
                  <span className="relative flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">
                      {o.label ?? t("preview.draw")}
                    </span>
                    <span className="shrink-0 tnum text-xs font-bold text-foreground">
                      {o.share}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p
            className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {picked ? t("preview.locked") : t("preview.idle")}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/80">{t("preview.fine")}</p>
        </div>
      </div>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-5 sm:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-xl font-extrabold leading-tight">
              Great pick! 👏
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Lock in this prediction on your public profile before kick-off as soon as we go live
              🚀
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 sm:flex-col">
            <Button asChild className="h-12 w-full text-sm font-bold">
              <Link to="/founding" onClick={() => setSignupOpen(false)}>
                Get Started <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
