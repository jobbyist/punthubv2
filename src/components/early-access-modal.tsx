import { motion } from "motion/react";
import { Apple, Chrome, Mail, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session";

const FORMSPREE_ENDPOINT = import.meta.env['VITE_FORMSPREE_ENDPOINT'] as string | undefined;

export function EarlyAccessModal() {
  const { earlyAccessOpen, closeEarlyAccess, reason, enterGuest, plan } = useSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (FORMSPREE_ENDPOINT) {
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name,
            email,
            plan: plan ?? "Unspecified",
            source: "Puntr early access",
            page: typeof window !== "undefined" ? window.location.pathname : "",
          }),
        });
        if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
      }
      setDone(true);
      toast.success("Welcome to the beta list", {
        description: `${plan ?? "Your plan"} reserved · 1 000 PuntPoints waiting.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("We couldn't submit that", { description: "Please try again in a moment." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={earlyAccessOpen} onOpenChange={(o) => !o && closeEarlyAccess()}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border p-0 sm:max-w-md">
        <div className="bg-primary-soft px-6 pb-6 pt-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" /> Beta • Early access
          </span>
          <h2 className="mt-4 text-2xl leading-tight">
            Join the Puntr <span className="text-primary">beta group</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {reason ?? "Get exclusive access before everyone else — plus 1 000 free PuntPoints on launch."}
          </p>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary"
            >
              <Sparkles className="size-6" />
            </motion.div>
            <h3 className="mt-4 text-lg">You're on the list</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll email you as soon as your beta invite is ready.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                enterGuest();
                closeEarlyAccess();
              }}
            >
              Browse as guest meanwhile
            </Button>
          </div>
        ) : (
          <form className="space-y-4 px-6 pb-6 pt-5" onSubmit={submit}>
            {plan && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Selected plan</span>
                <span className="font-semibold text-primary">{plan}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ea-name">Full name</Label>
              <Input id="ea-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ea-email">Email address</Label>
              <Input
                id="ea-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
              {submitting ? "Sending…" : "Request early access"}
            </Button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[Chrome, Apple, Mail].map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={["Continue with Google", "Continue with Apple", "Continue with email"][i]}
                  onClick={() => toast("Available when the beta opens")}
                  className="grid h-10 place-items-center rounded-lg border border-border transition-colors hover:bg-muted"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                enterGuest();
                closeEarlyAccess();
              }}
              className="w-full pt-1 text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Browse as guest
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              18+ only. Bet responsibly. By joining you agree to our Terms & Privacy Policy.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
