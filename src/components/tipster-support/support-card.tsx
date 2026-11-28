import { Link } from "@tanstack/react-router";
import { HeartHandshake, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAsync } from "@/hooks/use-async";
import { formatDate, points } from "@/lib/format";
import {
  fetchMyTipsterSupport,
  fetchTipsterCard,
  offeredPlans,
  supportTipster,
  tipsterErrorKey,
  type SupportPlan,
  type TipsterCard,
} from "@/lib/tipster-support";

/**
 * Tipster Support on a member's public record. Renders nothing unless the member has unlocked it (and the
 * migration is live). Supporting opens a plan picker; the database re-checks every rule.
 */
export function TipsterSupportCard({ username, isSelf }: { username: string; isSelf: boolean }) {
  const { t } = useTranslation("tipster");
  const { user } = useSession();
  const [version, setVersion] = useState(0);
  const { data: card } = useAsync(() => fetchTipsterCard(username), [username, user?.id, version]);
  if (!card || !card.available) return null;
  const plans = offeredPlans(card);

  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="tipster-card-title">
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="tipster-card-title" className="text-base">
            {t("card.title", { username: card.username })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {card.pitch || t("card.pitchFallback", { username: card.username })}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {t("card.supporters", { count: card.supporters ?? 0 })}
          </p>
        </div>
      </div>

      {plans.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {plans.map(({ plan, price }) => (
            <li key={plan} className="border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`card.plan.${plan}`)}
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tnum">{points(price)}</p>
              <p className="text-[11px] text-muted-foreground">
                {t(`card.price.${plan}`, { points: points(price) })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {isSelf ? (
          <p className="text-sm text-muted-foreground">{t("card.selfNote")}</p>
        ) : card.mine ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">
              {t("card.supporting", { username: card.username })}
              {card.mine.period_end && (
                <span className="ml-2 font-normal text-muted-foreground">
                  {card.mine.auto_renew
                    ? t("supporting.renews", { date: formatDate(card.mine.period_end) })
                    : t("supporting.ends", { date: formatDate(card.mine.period_end) })}
                </span>
              )}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/tipster-support">{t("card.manage")}</Link>
            </Button>
          </div>
        ) : !card.accepting || plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("card.notAccepting", { username: card.username })}
          </p>
        ) : user ? (
          <SupportDialog card={card} onDone={() => setVersion((v) => v + 1)} />
        ) : (
          <Button asChild>
            <Link to="/join">{t("card.button")}</Link>
          </Button>
        )}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{t("card.noAdvice")}</p>
    </section>
  );
}

function SupportDialog({ card, onDone }: { card: TipsterCard; onDone: () => void }) {
  const { t } = useTranslation("tipster");
  const plans = offeredPlans(card);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<SupportPlan>(plans[0]?.plan ?? "pick");
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { data: mine } = useAsync(
    () => (open ? fetchMyTipsterSupport() : Promise.resolve(null)),
    [open],
  );
  const price = plans.find((p) => p.plan === plan)?.price ?? 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await supportTipster(card.username, plan, autoRenew);
      setDone(true);
      onDone();
    } catch (e) {
      setError(t(tipsterErrorKey(e instanceof Error ? e.message : null)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setDone(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>{t("card.button")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("card.title", { username: card.username })}</DialogTitle>
          <DialogDescription>{t("card.plans")}</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-sm font-semibold text-primary" role="status">
            {t("card.done", { username: card.username })}
          </p>
        ) : (
          <div className="space-y-4">
            <div role="radiogroup" aria-label={t("card.plans")} className="grid gap-2">
              {plans.map((p) => (
                <button
                  key={p.plan}
                  type="button"
                  role="radio"
                  aria-checked={plan === p.plan}
                  onClick={() => setPlan(p.plan)}
                  className={`border p-3 text-left transition-colors ${plan === p.plan ? "border-primary bg-primary-soft/60" : "border-border hover:bg-muted/40"}`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">{t(`card.plan.${p.plan}`)}</span>
                    <span className="text-sm tnum">
                      {t(`card.price.${p.plan}`, { points: points(p.price) })}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(`card.planHelp.${p.plan}`)}
                  </span>
                </button>
              ))}
            </div>
            {plan !== "pick" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tipster-auto-renew"
                  checked={autoRenew}
                  onCheckedChange={(v) => setAutoRenew(v === true)}
                />
                <Label htmlFor="tipster-auto-renew">{t("card.autoRenew")}</Label>
              </div>
            )}
            {mine && (
              <p className="text-xs text-muted-foreground">
                {t("card.available", { points: points(mine.transferable) })}
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("card.noAdvice")}
            </p>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={busy} onClick={() => void submit()}>
              {busy
                ? t("card.busy")
                : plan === "pick"
                  ? t("card.confirmPick")
                  : t("card.confirm", { points: points(price) })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
