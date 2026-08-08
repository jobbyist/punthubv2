import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Clock, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session";
import { submitEarlyAccess } from "@/lib/early-access";
import { submitEarlyAccessForm } from "@/lib/early-access.functions";
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

  const selectedPlan = plan ?? "Free Plan";

  async function runSubmit() {
    if (submitting) return;

    setSubmitting(true);
    setErrorTitle(null);
    setErrorDetail(null);
    setAttempts((a) => a + 1);

    try {
      // FormBackend is the source of truth for delivery/notifications.
      const form = await submitEarlyAccessForm({
        data: { name, email, phone, plan: selectedPlan },
      });

      if (!form?.sent) {
        analytics.earlyAccessFailed(selectedPlan, form?.reason ?? "FORM_FAILED");
        setErrorTitle("We couldn't reserve your spot");
        setErrorDetail("Something went wrong sending your details. Your details are saved below — tap “Try again”.");
        return;
      }

      // Log the submission in our database too (never blocks the user).
      const logged = await submitEarlyAccess({ name, email, phone, plan: selectedPlan });
      if (!logged.success && logged.error !== "DUPLICATE_EMAIL") {
        console.error("Early access log failed:", logged.error);
      }

      analytics.earlyAccessSubmitted(selectedPlan);
      setConfirmedPlan(selectedPlan);
      setDone(true);
      toast.success("Spot reserved!", {
        description: `${selectedPlan} held for you — our team will review within 1–2 working days.`,
      });
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl border-border p-0 sm:max-w-md">
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
              Your spot is <span className="text-primary">reserved</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you, {name.split(" ")[0] || "there"} — your request is in. No payment was taken and none is required
              at this stage.
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
                <span className="text-muted-foreground">We'll contact you on</span>
                <span className="max-w-[55%] truncate font-medium">{email}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-border bg-primary-soft/40 px-4 py-4 text-left">
              <p className="text-sm font-semibold">What happens next</p>
              <div className="flex gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Our team manually reviews every request. This usually takes{" "}
                  <span className="font-medium text-foreground">1–2 working days</span>.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Once approved, you'll receive a confirmation <span className="font-medium text-foreground">email
                  and SMS</span> with full details about the Puntr early access programme.
                </p>
              </div>
              <div className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  That message includes a quick KYC verification step — required because Puntr is an 18+ betting
                  platform.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              You won't receive an automated email right away — keep an eye out for our team's message.
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
                Reserve your <span className="text-primary">Puntr beta spot</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {reason ?? "Get exclusive access before everyone else — plus 1 000 free PuntPoints on launch."}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Reservation only — no card, no payment today
              </p>
            </div>

            <form className="space-y-4 px-6 pb-6 pt-5" onSubmit={submit}>
              {errorTitle && (
                <div className="flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-left">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-semibold text-destructive">{errorTitle}</p>
                    {errorDetail && <p className="mt-0.5 text-muted-foreground">{errorDetail}</p>}
                    {attempts > 1 && (
                      <p className="mt-0.5 text-muted-foreground">Attempt {attempts} — your details are kept.</p>
                    )}
                  </div>
                </div>
              )}
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
                <p className="text-[11px] text-muted-foreground">Used for your SMS invite and KYC verification.</p>
              </div>
              <Button type="submit" disabled={submitting} className="h-11 w-full text-[15px]">
                {submitting ? "Reserving…" : errorTitle ? (
                  <>
                    <RotateCcw className="size-4" /> Try again
                  </>
                ) : (
                  "Reserve my spot — free"
                )}
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
                No payment is taken during early access — you only reserve your plan. Approval follows a short manual
                review (1–2 working days).<br />
                18+ only. Bet responsibly. By joining you agree to our Terms & Privacy Policy.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
