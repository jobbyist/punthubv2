import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session";
import { submitEarlyAccess } from "@/lib/early-access";
import { sendEarlyAccessWelcome } from "@/lib/early-access.functions";
import { analytics } from "@/lib/analytics";

export function EarlyAccessModal() {
  const { earlyAccessOpen, closeEarlyAccess, reason, enterGuest, plan } = useSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [confirmedPlan, setConfirmedPlan] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [emailSent, setEmailSent] = useState(true);

  const selectedPlan = plan ?? "Free Plan";

  async function runSubmit() {
    if (submitting) return;

    setSubmitting(true);
    setErrorTitle(null);
    setErrorDetail(null);
    setAttempts((a) => a + 1);

    try {
      const result = await submitEarlyAccess({ name, email, phone, plan: selectedPlan });

      if (!result.success) {
        analytics.earlyAccessFailed(selectedPlan, result.error ?? "UNKNOWN");
        if (result.error === "DUPLICATE_EMAIL") {
          setErrorTitle("This email is already on the beta list");
          setErrorDetail("Check your inbox for your confirmation, or use a different email address.");
        } else if (result.error === "INVALID_EMAIL" || result.error === "INVALID_PHONE") {
          setErrorTitle("Please check your details");
          setErrorDetail(result.message);
        } else {
          setErrorTitle("We couldn't reserve your spot");
          setErrorDetail(`${result.message} Your details are saved below — tap “Try again”.`);
        }
        return;
      }

      analytics.earlyAccessSubmitted(selectedPlan);
      setConfirmedPlan(selectedPlan);
      setDone(true);
      toast.success("Welcome to the beta list!", {
        description: `${selectedPlan} reserved · 1 000 PuntPoints waiting.`,
      });

      try {
        const mail = await sendEarlyAccessWelcome({
          data: { name, email, plan: selectedPlan },
        });
        setEmailSent(Boolean(mail?.sent));
      } catch {
        setEmailSent(false);
      }
    } catch {
      analytics.earlyAccessFailed(selectedPlan, "NETWORK");
      setErrorTitle("Connection problem");
      setErrorDetail("We couldn't reach our servers. Check your connection and tap “Try again” — your details are kept.");
    } finally {
      setSubmitting(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit();
  }


  return (
    <Dialog open={earlyAccessOpen} onOpenChange={(o) => !o && closeEarlyAccess()}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border p-0 sm:max-w-md">
        {done ? (
          <div className="px-6 pb-8 pt-10 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary"
            >
              <CheckCircle2 className="size-8" strokeWidth={1.8} />
            </motion.div>

            <h2 className="mt-5 text-2xl leading-tight">
              You're on the <span className="text-primary">Puntr beta list</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you, {name.split(" ")[0] || "there"} — your spot is reserved. We'll email and SMS you the moment
              your invite is ready.
            </p>

            <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan reserved</span>
                <span className="font-semibold text-primary">{confirmedPlan}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Welcome bonus</span>
                <span className="font-semibold tnum">1 000 PuntPoints</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmation sent to</span>
                <span className="max-w-[55%] truncate font-medium">{email}</span>
              </div>
            </div>

            {!emailSent && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left">
                <p className="text-xs text-muted-foreground">
                  Your spot is reserved, but we couldn't deliver the confirmation email.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      const mail = await sendEarlyAccessWelcome({
                        data: { name, email, plan: confirmedPlan ?? selectedPlan },
                      });
                      if (mail?.sent) {
                        setEmailSent(true);
                        toast.success("Confirmation email sent");
                      } else {
                        toast.error("Still couldn't send", { description: "Please try again in a moment." });
                      }
                    } catch {
                      toast.error("Still couldn't send", { description: "Please try again in a moment." });
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <RotateCcw className="size-4" /> Resend confirmation email
                </Button>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              No payment is taken during early access — you only reserve your plan.
            </p>


            <Button
              className="mt-5 w-full"
              onClick={() => {
                enterGuest();
                closeEarlyAccess();
              }}
            >
              Browse Puntr meanwhile
            </Button>
          </div>
        ) : (
          <>
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

            <form className="space-y-4 px-6 pb-6 pt-5" onSubmit={submit}>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Selected plan</span>
                <span className="font-semibold text-primary">{selectedPlan}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ea-name">Full name</Label>
                <Input
                  id="ea-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ea-email">Email address</Label>
                <Input
                  id="ea-email"
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ea-phone">Phone number</Label>
                <Input
                  id="ea-phone"
                  type="tel"
                  required
                  inputMode="tel"
                  maxLength={20}
                  pattern="[0-9+()\s-]{7,20}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                />
              </div>
              <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
                {submitting ? "Sending…" : "Request early access"}
              </Button>

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
                No payment is taken during early access — you only reserve your plan.<br />
                18+ only. Bet responsibly. By joining you agree to our Terms & Privacy Policy.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
