import { Camera, ClipboardPaste, Keyboard, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { UpcomingFixture } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import {
  combinedOdds,
  KNOWN_BOOKMAKERS,
  parseAmount,
  parseOdds,
  SELECTIONS,
  validateDraft,
  type SlipDraft,
  type SlipLegDraft,
  type SlipMarket,
  type SlipSource,
} from "@/lib/slips/parse";
import { scrubSlipText } from "@/lib/slips/scrub";
import { parseSlip } from "@/lib/slips/slips.functions";
import { publishSlip, saveSlipDraft, slipErrorKey } from "@/lib/slips/slips-data";
import { cn } from "@/lib/utils";

const MARKETS: SlipMarket[] = ["1X2", "OU25", "BTTS", "DC"];
const FIELD =
  "h-10 w-full border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

const emptyLeg = (): SlipLegDraft => ({
  home: "",
  away: "",
  market: null,
  selection: null,
  odds: null,
  fixtureId: null,
});
const emptyDraft = (): SlipDraft => ({
  bookmaker: null,
  betType: "single",
  stake: null,
  totalOdds: null,
  potentialReturn: null,
  legs: [emptyLeg()],
});

type Step = "source" | "paste" | "photo" | "review";

export function SlipEditor({
  userId,
  fixtures,
  onDone,
}: {
  userId: string;
  fixtures: UpcomingFixture[];
  onDone: () => void;
}) {
  const { t } = useTranslation("slips");
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<SlipSource>("manual");
  const [draft, setDraft] = useState<SlipDraft>(emptyDraft);
  const [pasted, setPasted] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showStake, setShowStake] = useState(false);
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fixtureById = useMemo(() => new Map(fixtures.map((f) => [f.id, f])), [fixtures]);
  const issues = validateDraft(draft);

  const reset = () => {
    setStep("source");
    setDraft(emptyDraft());
    setPasted("");
    setImage(null);
    setNotice(null);
    setNote("");
    setShowStake(false);
  };

  async function readText(text: string, from: "text" | "image") {
    // Scrubbed here first so the raw text never leaves the device; the server scrubs again.
    const local = scrubSlipText(text);
    const r = await parseSlip({ data: { text: local.text, source: from } });
    if (!r.ok) {
      toast.error(t(`errors.${r.error}`));
      return false;
    }
    const removed = local.removed + r.removed;
    setNotice(
      [
        removed > 0 ? t("removed", { count: removed }) : null,
        r.usedAi ? t("aiLeft", { count: r.aiLeft }) : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
    setDraft(r.draft.legs.length ? r.draft : emptyDraft());
    setStep("review");
    return true;
  }

  async function onPaste() {
    setBusy(true);
    try {
      await readText(pasted, "text");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File) {
    setBusy(true);
    setProgress(t("photo.preparing"));
    try {
      const { prepareSlipImage, readSlipImage } = await import("@/lib/slips/image-browser");
      let blob: Blob;
      try {
        blob = await prepareSlipImage(file);
      } catch (e) {
        const k = e instanceof Error ? e.message : "image_decode";
        toast.error(t(`errors.${["image_type", "image_size"].includes(k) ? k : "image_decode"}`));
        return;
      }
      setImage(blob);
      let text = "";
      try {
        text = await readSlipImage(blob, (pct) => setProgress(t("photo.reading", { pct })));
      } catch {
        toast.error(t("errors.ocr"));
        setDraft(emptyDraft());
        setStep("review");
        return;
      }
      setProgress(null);
      const ok = await readText(text, "image");
      if (!ok) {
        setDraft(emptyDraft());
        setStep("review");
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const setLeg = (i: number, patch: Partial<SlipLegDraft>) =>
    setDraft((d) => {
      const legs = d.legs.map((l, j) => (j === i ? { ...l, ...patch } : l));
      return {
        ...d,
        legs,
        betType: legs.length > 1 ? "multi" : "single",
        totalOdds: combinedOdds(legs) ?? d.totalOdds,
      };
    });

  async function save(publish: boolean) {
    if (issues.length) return;
    setBusy(true);
    try {
      const id = await saveSlipDraft(draft, { userId, source, showStake, note, image });
      if (publish) {
        try {
          const r = await publishSlip(id, confidence);
          toast.success(t("done.published", { count: r.picks }));
        } catch (e) {
          // The slip is saved as a draft; the member can fix it and publish from "My slips".
          toast.error(t(`errors.${slipErrorKey(e)}`));
          toast.message(t("done.draft"));
        }
      } else {
        toast.success(t("done.draft"));
      }
      reset();
      onDone();
    } catch (e) {
      toast.error(t(`errors.${slipErrorKey(e)}`));
    } finally {
      setBusy(false);
    }
  }

  if (step === "source") {
    const options: { key: SlipSource; icon: typeof Keyboard; go: () => void }[] = [
      {
        key: "manual",
        icon: Keyboard,
        go: () => (setSource("manual"), setDraft(emptyDraft()), setStep("review")),
      },
      { key: "text", icon: ClipboardPaste, go: () => (setSource("text"), setStep("paste")) },
      { key: "image", icon: Camera, go: () => (setSource("image"), setStep("photo")) },
    ];
    return (
      <section aria-labelledby="slip-source">
        <h2 id="slip-source" className="mb-4 font-display text-lg font-bold">
          {t("source.title")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map(({ key, icon: Icon, go }) => (
            <button
              key={key}
              type="button"
              onClick={go}
              className="flex flex-col items-start gap-2 border border-border bg-card p-4 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="font-semibold">{t(`source.${key}`)}</span>
              <span className="text-sm text-muted-foreground">{t(`source.${key}Hint`)}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (step === "paste") {
    return (
      <section className="space-y-3">
        <Label htmlFor="slip-text">{t("paste.label")}</Label>
        <Textarea
          id="slip-text"
          rows={10}
          value={pasted}
          maxLength={20000}
          placeholder={t("paste.placeholder")}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div className="flex gap-2">
          <Button disabled={busy || pasted.trim().length < 5} onClick={onPaste}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {t("paste.read")}
          </Button>
          <Button variant="outline" onClick={reset}>
            {t("review.cancel")}
          </Button>
        </div>
      </section>
    );
  }

  if (step === "photo") {
    return (
      <section className="space-y-4">
        <p className="flex gap-2 border border-border bg-muted p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t("photo.privacy")}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onPhoto(f);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="size-4" aria-hidden />
            )}
            {t("photo.choose")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={reset}>
            {t("review.cancel")}
          </Button>
          {progress && (
            <span role="status" className="text-sm text-muted-foreground">
              {progress}
            </span>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="slip-review">
      <div>
        <h2 id="slip-review" className="font-display text-lg font-bold">
          {t("review.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("review.hint")}</p>
        {notice && (
          <p role="status" className="mt-2 flex gap-2 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {notice}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="slip-bm">{t("review.bookmaker")}</Label>
          <select
            id="slip-bm"
            className={FIELD}
            value={draft.bookmaker ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, bookmaker: e.target.value || null }))}
          >
            <option value="">{t("review.bookmakerNone")}</option>
            {KNOWN_BOOKMAKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("review.bookmakerPrivate")}</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="slip-stake">{t("review.stake")}</Label>
          <Input
            id="slip-stake"
            inputMode="decimal"
            placeholder="R"
            defaultValue={draft.stake ?? ""}
            onBlur={(e) =>
              setDraft((d) => ({
                ...d,
                stake: e.target.value ? (parseAmount(e.target.value) ?? -1) : null,
              }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="slip-return">{t("review.return")}</Label>
          <Input
            id="slip-return"
            inputMode="decimal"
            placeholder="R"
            defaultValue={draft.potentialReturn ?? ""}
            onBlur={(e) =>
              setDraft((d) => ({
                ...d,
                potentialReturn: e.target.value ? (parseAmount(e.target.value) ?? -1) : null,
              }))
            }
          />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">{t("review.legs")}</legend>
        {draft.legs.map((leg, i) => {
          const linked = leg.fixtureId ? fixtureById.get(leg.fixtureId) : undefined;
          const becomesPick = !!(leg.fixtureId && leg.market && leg.selection);
          return (
            <div key={i} className="border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{t("review.leg", { n: i + 1 })}</span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    becomesPick ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {becomesPick ? t("review.becomesPick") : t("review.trackedOnly")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`leg-fx-${i}`}>{t("review.fixture")}</Label>
                  <select
                    id={`leg-fx-${i}`}
                    className={FIELD}
                    value={leg.fixtureId ?? ""}
                    onChange={(e) => {
                      const f = fixtureById.get(e.target.value);
                      setLeg(
                        i,
                        f
                          ? {
                              fixtureId: f.id,
                              home: f.home,
                              away: f.away,
                              competition: f.competition,
                            }
                          : { fixtureId: null },
                      );
                    }}
                  >
                    <option value="">{t("review.fixtureNone")}</option>
                    {fixtures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.home} v {f.away} · {formatDate(f.kickoff_at)} {formatTime(f.kickoff_at)}
                      </option>
                    ))}
                  </select>
                </div>
                {!linked && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`leg-h-${i}`}>{t("review.home")}</Label>
                      <Input
                        id={`leg-h-${i}`}
                        maxLength={80}
                        value={leg.home}
                        onChange={(e) => setLeg(i, { home: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`leg-a-${i}`}>{t("review.away")}</Label>
                      <Input
                        id={`leg-a-${i}`}
                        maxLength={80}
                        value={leg.away}
                        onChange={(e) => setLeg(i, { away: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label htmlFor={`leg-m-${i}`}>{t("review.market")}</Label>
                  <select
                    id={`leg-m-${i}`}
                    className={FIELD}
                    value={leg.market ?? ""}
                    onChange={(e) =>
                      setLeg(i, {
                        market: (e.target.value || null) as SlipMarket | null,
                        selection: null,
                      })
                    }
                  >
                    <option value="">{t("review.marketNone")}</option>
                    {MARKETS.map((m) => (
                      <option key={m} value={m}>
                        {t(`markets.${m}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`leg-s-${i}`}>{t("review.selection")}</Label>
                  <select
                    id={`leg-s-${i}`}
                    className={FIELD}
                    disabled={!leg.market}
                    value={leg.selection ?? ""}
                    onChange={(e) => setLeg(i, { selection: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {leg.market &&
                      SELECTIONS[leg.market].map((s) => (
                        <option key={s} value={s}>
                          {leg.market === "1X2" && s === "home" && leg.home
                            ? leg.home
                            : leg.market === "1X2" && s === "away" && leg.away
                              ? leg.away
                              : t(`selections.${s}`)}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`leg-o-${i}`}>{t("review.odds")}</Label>
                  <Input
                    id={`leg-o-${i}`}
                    inputMode="decimal"
                    defaultValue={leg.odds ?? ""}
                    onBlur={(e) =>
                      setLeg(i, { odds: e.target.value ? (parseOdds(e.target.value) ?? 0) : null })
                    }
                  />
                </div>
                {(leg.rawMarket || leg.rawSelection) && (
                  <p className="self-end text-xs text-muted-foreground">
                    {t("review.bookmakerWording", {
                      text: [leg.rawMarket, leg.rawSelection].filter(Boolean).join(": "),
                    })}
                  </p>
                )}
              </div>
              {draft.legs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    setDraft((d) => ({ ...d, legs: d.legs.filter((_, j) => j !== i) }))
                  }
                >
                  <Trash2 className="size-4" aria-hidden /> {t("review.removeLeg")}
                </Button>
              )}
            </div>
          );
        })}
        {draft.legs.length < 30 && (
          <Button
            variant="outline"
            onClick={() => setDraft((d) => ({ ...d, legs: [...d.legs, emptyLeg()] }))}
          >
            <Plus className="size-4" aria-hidden /> {t("review.addLeg")}
          </Button>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="slip-note">{t("review.note")}</Label>
          <Textarea
            id="slip-note"
            rows={2}
            maxLength={280}
            value={note}
            placeholder={t("review.notePlaceholder")}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="slip-conf">{t("review.confidence")}</Label>
            <select
              id="slip-conf"
              className={FIELD}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}/5
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="slip-show" checked={showStake} onCheckedChange={setShowStake} />
            <Label htmlFor="slip-show" className="text-sm font-normal">
              {t("review.showStake")}
            </Label>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {issues.map((k) => (
            <li key={k}>{t(`issues.${k}`)}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || issues.length > 0} onClick={() => void save(true)}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {t("review.publish")}
        </Button>
        <Button
          variant="outline"
          disabled={busy || issues.length > 0}
          onClick={() => void save(false)}
        >
          {t("review.saveDraft")}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={reset}>
          {t("review.cancel")}
        </Button>
      </div>
    </section>
  );
}
