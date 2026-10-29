import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatDate, points } from "@/lib/format";
import { REWARD_KINDS } from "@/lib/rewards";

const panel = "card-surface p-5";

function num(v: string): number | null {
  const n = Number(v);
  return v.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : null;
}

function Settings() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const { data: rows, error } = await supabase.from("reward_settings").select("key, enabled");
    if (error) throw error;
    return rows ?? [];
  }, [tick]);

  async function toggle(key: string, enabled: boolean) {
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("reward_settings")
      .update({ enabled, updated_at: new Date().toISOString(), updated_by: me.user?.id ?? null })
      .eq("key", key);
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("rewards.settings.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.settings.body")}</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(["points_enabled", "rewards_enabled", "betting_vouchers_enabled"] as const).map((k) => {
          const on = data?.find((r) => r.key === k)?.enabled ?? false;
          return (
            <li key={k} className="flex items-start justify-between gap-4 py-3">
              <label htmlFor={`rs-${k}`} className="min-w-0">
                <span className="block font-semibold">{t(`rewards.settings.${k}`)}</span>
                <span className="block text-xs text-muted-foreground">
                  {t(`rewards.settings.${k}Hint`)}
                </span>
              </label>
              <Switch id={`rs-${k}`} checked={on} onCheckedChange={(v) => void toggle(k, v)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Rules() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const [r, m] = await Promise.all([
      supabase.from("point_rules").select("*").order("sort"),
      supabase.from("referral_milestones").select("*").order("threshold"),
    ]);
    return { rules: r.data ?? [], milestones: m.data ?? [] };
  }, [tick]);

  async function saveRule(rule: Tables<"point_rules">, f: FormData) {
    const pts = num(String(f.get("points") ?? ""));
    const day = String(f.get("day") ?? "").trim();
    const month = String(f.get("month") ?? "").trim();
    if (!pts || pts < 1) return void toast.error(t("rewards.error"));
    const { error } = await supabase
      .from("point_rules")
      .update({
        points: pts,
        cap_per_day: day ? num(day) : null,
        cap_per_month: month ? num(month) : null,
        active: f.get("active") === "on",
        updated_at: new Date().toISOString(),
      })
      .eq("code", rule.code);
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }

  async function saveMilestone(threshold: number, f: FormData) {
    const bonus = num(String(f.get("bonus") ?? ""));
    if (!bonus || bonus < 1) return void toast.error(t("rewards.error"));
    const { error } = await supabase
      .from("referral_milestones")
      .update({ bonus_points: bonus, active: f.get("active") === "on" })
      .eq("threshold", threshold);
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("rewards.rules.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.rules.body")}</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(data?.rules ?? []).map((r) => (
          <li key={r.code} className="py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveRule(r, new FormData(e.currentTarget));
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <span className="min-w-40 flex-1 font-semibold">{r.title}</span>
              <label className="text-xs">
                {t("rewards.rules.points")}
                <Input
                  name="points"
                  defaultValue={r.points}
                  inputMode="numeric"
                  className="mt-1 w-20"
                />
              </label>
              <label className="text-xs">
                {t("rewards.rules.day")}
                <Input
                  name="day"
                  defaultValue={r.cap_per_day ?? ""}
                  inputMode="numeric"
                  className="mt-1 w-20"
                />
              </label>
              <label className="text-xs">
                {t("rewards.rules.month")}
                <Input
                  name="month"
                  defaultValue={r.cap_per_month ?? ""}
                  inputMode="numeric"
                  className="mt-1 w-20"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="active" defaultChecked={r.active} />{" "}
                {t("rewards.rules.active")}
              </label>
              <Button type="submit" size="sm">
                {t("rewards.save")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-sm font-semibold">{t("rewards.rules.milestones")}</h3>
      <ul className="mt-2 divide-y divide-border text-sm">
        {(data?.milestones ?? []).map((m) => (
          <li key={m.threshold} className="py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveMilestone(m.threshold, new FormData(e.currentTarget));
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <span className="min-w-40 flex-1 font-semibold">
                {m.title} · {t("rewards.rules.at", { count: m.threshold })}
              </span>
              <label className="text-xs">
                {t("rewards.rules.bonus")}
                <Input
                  name="bonus"
                  defaultValue={m.bonus_points}
                  inputMode="numeric"
                  className="mt-1 w-24"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="active" defaultChecked={m.active} />{" "}
                {t("rewards.rules.active")}
              </label>
              <Button type="submit" size="sm">
                {t("rewards.save")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Catalogue() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const [r, c] = await Promise.all([
      supabase.from("rewards").select("*").order("points_cost"),
      supabase.from("reward_codes").select("reward_id, redemption_id"),
    ]);
    return { rewards: r.data ?? [], codes: c.data ?? [] };
  }, [tick]);
  const [codesFor, setCodesFor] = useState<string | null>(null);
  const [codes, setCodes] = useState("");

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cost = num(String(f.get("cost") ?? ""));
    const stock = String(f.get("stock") ?? "").trim();
    if (!cost || cost < 1) return void toast.error(t("rewards.error"));
    const { error } = await supabase.from("rewards").insert({
      code: String(f.get("code") ?? "")
        .trim()
        .toLowerCase(),
      title: String(f.get("title") ?? "").trim(),
      description: String(f.get("description") ?? "").trim() || null,
      kind: String(f.get("kind") ?? "perk"),
      points_cost: cost,
      stock: stock ? num(stock) : null,
      sponsor: String(f.get("sponsor") ?? "").trim() || null,
      requires_approval: f.get("approval") === "on",
      active: false,
    });
    if (error) return void toast.error(t("rewards.error"));
    toast.success(t("rewards.saved"));
    e.currentTarget.reset();
    setTick((n) => n + 1);
  }

  async function setActive(id: string, active: boolean) {
    const { error } = await supabase.from("rewards").update({ active }).eq("id", id);
    if (error) toast.error(t("rewards.error"));
    setTick((n) => n + 1);
  }

  async function addCodes() {
    if (!codesFor) return;
    const rows = [
      ...new Set(
        codes
          .split(/\r?\n/)
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ].map((code) => ({
      reward_id: codesFor,
      code,
    }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("reward_codes").insert(rows);
    if (error) return void toast.error(t("rewards.error"));
    toast.success(t("rewards.codes.added", { count: rows.length }));
    setCodes("");
    setCodesFor(null);
    setTick((n) => n + 1);
  }

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("rewards.catalogue.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.catalogue.body")}</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {(data?.rewards ?? []).map((r) => {
          const mine = (data?.codes ?? []).filter((c) => c.reward_id === r.id);
          return (
            <li key={r.id} className="py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t(`rewards.kind.${r.kind}`)} · {points(r.points_cost)} ·{" "}
                  {mine.length > 0
                    ? t("rewards.codes.left", {
                        left: mine.filter((c) => !c.redemption_id).length,
                        total: mine.length,
                      })
                    : r.stock === null
                      ? t("rewards.catalogue.unlimited")
                      : t("rewards.catalogue.stock", { count: r.stock })}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => setCodesFor(codesFor === r.id ? null : r.id)}
                  >
                    {t("rewards.codes.add")}
                  </button>
                  <Switch
                    aria-label={t("rewards.rules.active")}
                    checked={r.active}
                    onCheckedChange={(v) => void setActive(r.id, v)}
                  />
                </span>
              </div>
              {codesFor === r.id && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={codes}
                    onChange={(e) => setCodes(e.target.value)}
                    rows={4}
                    placeholder={t("rewards.codes.placeholder")}
                  />
                  <Button size="sm" onClick={() => void addCodes()}>
                    {t("rewards.codes.save")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <form
        onSubmit={(e) => void create(e)}
        className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2"
      >
        <h3 className="text-sm font-semibold sm:col-span-2">{t("rewards.catalogue.new")}</h3>
        <Input
          name="code"
          placeholder={t("rewards.catalogue.code")}
          aria-label={t("rewards.catalogue.code")}
        />
        <Input
          name="title"
          placeholder={t("rewards.catalogue.name")}
          aria-label={t("rewards.catalogue.name")}
        />
        <select
          name="kind"
          aria-label={t("rewards.catalogue.kind")}
          className="h-10 border border-input bg-background px-3 text-sm"
        >
          {REWARD_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`rewards.kind.${k}`)}
            </option>
          ))}
        </select>
        <Input
          name="cost"
          placeholder={t("rewards.catalogue.cost")}
          aria-label={t("rewards.catalogue.cost")}
          inputMode="numeric"
        />
        <Input
          name="stock"
          placeholder={t("rewards.catalogue.stockHint")}
          aria-label={t("rewards.catalogue.stockHint")}
          inputMode="numeric"
        />
        <Input
          name="sponsor"
          placeholder={t("rewards.catalogue.sponsor")}
          aria-label={t("rewards.catalogue.sponsor")}
        />
        <Textarea
          name="description"
          placeholder={t("rewards.catalogue.description")}
          aria-label={t("rewards.catalogue.description")}
          className="sm:col-span-2"
          rows={2}
        />
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input type="checkbox" name="approval" defaultChecked /> {t("rewards.catalogue.approval")}
        </label>
        <Button type="submit" className="sm:col-span-2">
          {t("rewards.catalogue.create")}
        </Button>
      </form>
    </section>
  );
}

type Row = Tables<"redemptions"> & {
  reward: { title: string; kind: string } | null;
  member: { username: string } | null;
};

function Redemptions() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const { data: rows } = await supabase
      .from("redemptions")
      .select("*, reward:rewards(title, kind), member:profiles(username)")
      .eq("status", "requested")
      .order("created_at");
    return (rows ?? []) as unknown as Row[];
  }, [tick]);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function fulfil(id: string) {
    const { error } = await supabase.rpc("admin_fulfil_redemption", { p_redemption: id });
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }
  async function cancel(id: string) {
    const why = (reason[id] ?? "").trim();
    if (!why) return void toast.error(t("rewards.redemptions.reasonNeeded"));
    const { error } = await supabase.rpc("admin_cancel_redemption", {
      p_redemption: id,
      p_reason: why,
    });
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("rewards.redemptions.title")}</h2>
      {!data || data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("rewards.redemptions.empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.map((r) => (
            <li key={r.id} className="py-3">
              <p className="font-semibold">
                {r.reward?.title} · @{r.member?.username}
              </p>
              <p className="text-xs text-muted-foreground tnum">
                {formatDate(r.created_at)} · {points(r.points)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void fulfil(r.id)}>
                  {t("rewards.redemptions.fulfil")}
                </Button>
                <Input
                  aria-label={t("rewards.redemptions.reason")}
                  placeholder={t("rewards.redemptions.reason")}
                  value={reason[r.id] ?? ""}
                  onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                  className="w-56"
                />
                <Button size="sm" variant="destructive" onClick={() => void cancel(r.id)}>
                  {t("rewards.redemptions.cancel")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Adjust() {
  const { t } = useTranslation("admin");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [why, setWhy] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0 || !why.trim()) return void toast.error(t("rewards.error"));
    const { data: p } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();
    if (!p) return void toast.error(t("rewards.adjust.notFound"));
    const { error } = await supabase.rpc("admin_adjust_points", {
      p_user: p.id,
      p_points: n,
      p_reason: why.trim(),
    });
    if (error)
      return void toast.error(
        error.message.includes("would_go_negative")
          ? t("rewards.adjust.negative")
          : t("rewards.error"),
      );
    toast.success(t("rewards.saved"));
    setAmount("");
    setWhy("");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className={panel}>
      <h2 className="text-lg">{t("rewards.adjust.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.adjust.body")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Input
          aria-label={t("rewards.adjust.username")}
          placeholder={t("rewards.adjust.username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          aria-label={t("rewards.adjust.points")}
          placeholder={t("rewards.adjust.points")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
        />
        <Input
          aria-label={t("rewards.adjust.reason")}
          placeholder={t("rewards.adjust.reason")}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
        />
      </div>
      <Button type="submit" className="mt-3">
        {t("rewards.adjust.submit")}
      </Button>
    </form>
  );
}

function Referrals() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const { data: rows } = await supabase.rpc("admin_referral_review");
    return rows ?? [];
  }, [tick]);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function reverse(id: string) {
    const why = (reason[id] ?? "").trim();
    if (!why) return void toast.error(t("rewards.redemptions.reasonNeeded"));
    const { error } = await supabase.rpc("admin_reverse_referral", {
      p_referral: id,
      p_reason: why,
    });
    if (error) toast.error(t("rewards.error"));
    else toast.success(t("rewards.saved"));
    setTick((n) => n + 1);
  }

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("rewards.referrals.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rewards.referrals.body")}</p>
      {!data || data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("rewards.referrals.empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.map((r) => (
            <li key={r.id} className="py-3">
              <p>
                <span className="font-semibold">@{r.referrer}</span> → @{r.referred}{" "}
                {r.burst && (
                  <span className="ml-1 text-xs font-bold text-destructive">
                    {t("rewards.referrals.burst")}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground tnum">
                {formatDate(r.created_at)} · {t(`rewards.referrals.status.${r.status}`)}
              </p>
              {r.status !== "void" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input
                    aria-label={t("rewards.redemptions.reason")}
                    placeholder={t("rewards.redemptions.reason")}
                    value={reason[r.id] ?? ""}
                    onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                    className="w-56"
                  />
                  <Button size="sm" variant="outline" onClick={() => void reverse(r.id)}>
                    {t("rewards.referrals.reverse")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RewardsTab() {
  return (
    <div className="space-y-5">
      <Settings />
      <Rules />
      <Catalogue />
      <Redemptions />
      <Adjust />
      <Referrals />
    </div>
  );
}
