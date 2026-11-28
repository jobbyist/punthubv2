import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AFFILIATE_STATUSES, daysUntil } from "@/lib/affiliates";
import { formatDate, formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";

const CATEGORIES = ["bookmaker", "retail", "other"] as const;
const EVENT_KINDS = ["note", "email", "call", "payment"] as const;

type Partner = Tables<"affiliate_partners">;

const text = (f: FormData, k: string): string | null => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({
  name,
  defaultValue,
  options,
  label,
}: {
  name: string;
  defaultValue: string;
  options: readonly string[];
  label: (v: string) => string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-9 w-full border border-input bg-background px-2 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ))}
    </select>
  );
}

function PartnerForm({ partner, onDone }: { partner?: Partner; onDone: () => void }) {
  const { t } = useTranslation("admin");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payout = text(f, "min_payout_zar");
    const row = {
      name: String(f.get("name") ?? "").trim(),
      category: String(f.get("category") ?? "bookmaker"),
      status: String(f.get("status") ?? "applied"),
      network: text(f, "network"),
      website_url: text(f, "website_url"),
      dashboard_url: text(f, "dashboard_url"),
      tracking_link: text(f, "tracking_link"),
      contact_name: text(f, "contact_name"),
      contact_email: text(f, "contact_email"),
      commission_summary: text(f, "commission_summary"),
      min_payout_zar: payout && Number.isInteger(Number(payout)) ? Number(payout) : null,
      applied_at: text(f, "applied_at"),
      response_due_at: text(f, "response_due_at"),
      responded_at: text(f, "responded_at"),
      approved_at: text(f, "approved_at"),
      went_live_at: text(f, "went_live_at"),
      terms_accepted_at: text(f, "terms_accepted_at"),
      licence_checked_at: text(f, "licence_checked_at"),
      licence_notes: text(f, "licence_notes"),
      notes: text(f, "notes"),
    };
    if (!row.name) return void toast.error(t("affiliates.error"));

    if (partner) {
      const { error } = await supabase.from("affiliate_partners").update(row).eq("id", partner.id);
      if (error) {
        const live = row.status === "live" && !row.licence_checked_at;
        return void toast.error(t(live ? "affiliates.needLicence" : "affiliates.error"));
      }
      if (row.status !== partner.status) {
        await supabase.from("affiliate_partner_events").insert({
          partner_id: partner.id,
          kind: "status",
          body: t("affiliates.statusChanged", {
            from: t(`affiliates.status.${partner.status}`),
            to: t(`affiliates.status.${row.status}`),
          }),
        });
      }
    } else {
      const slug = row.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!slug) return void toast.error(t("affiliates.error"));
      const { data, error } = await supabase
        .from("affiliate_partners")
        .insert({ ...row, slug })
        .select("id")
        .single();
      if (error || !data) {
        const live = row.status === "live" && !row.licence_checked_at;
        return void toast.error(t(live ? "affiliates.needLicence" : "affiliates.error"));
      }
      await supabase.from("affiliate_partner_events").insert({
        partner_id: data.id,
        kind: "status",
        body: t("affiliates.added"),
      });
      e.currentTarget.reset();
    }
    toast.success(t("affiliates.saved"));
    onDone();
  }

  const d = (v: string | null | undefined) => v ?? "";
  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("affiliates.f.name")}>
        <Input name="name" required defaultValue={d(partner?.name)} />
      </Field>
      <Field label={t("affiliates.f.network")}>
        <Input name="network" defaultValue={d(partner?.network)} />
      </Field>
      <Field label={t("affiliates.f.category")}>
        <Select
          name="category"
          defaultValue={partner?.category ?? "bookmaker"}
          options={CATEGORIES}
          label={(v) => t(`affiliates.category.${v}`)}
        />
      </Field>
      <Field label={t("affiliates.f.status")}>
        <Select
          name="status"
          defaultValue={partner?.status ?? "applied"}
          options={AFFILIATE_STATUSES}
          label={(v) => t(`affiliates.status.${v}`)}
        />
      </Field>
      <Field label={t("affiliates.f.website")}>
        <Input name="website_url" type="url" defaultValue={d(partner?.website_url)} />
      </Field>
      <Field label={t("affiliates.f.dashboard")}>
        <Input name="dashboard_url" type="url" defaultValue={d(partner?.dashboard_url)} />
      </Field>
      <Field label={t("affiliates.f.trackingLink")} className="sm:col-span-2">
        <Input name="tracking_link" type="url" defaultValue={d(partner?.tracking_link)} />
        <span className="mt-1 block text-muted-foreground">{t("affiliates.f.trackingHint")}</span>
      </Field>
      <Field label={t("affiliates.f.contactName")}>
        <Input name="contact_name" defaultValue={d(partner?.contact_name)} />
      </Field>
      <Field label={t("affiliates.f.contactEmail")}>
        <Input name="contact_email" type="email" defaultValue={d(partner?.contact_email)} />
      </Field>
      <Field label={t("affiliates.f.commission")} className="sm:col-span-2">
        <Textarea
          name="commission_summary"
          rows={2}
          defaultValue={d(partner?.commission_summary)}
        />
      </Field>
      <Field label={t("affiliates.f.minPayout")}>
        <Input
          name="min_payout_zar"
          inputMode="numeric"
          defaultValue={partner?.min_payout_zar ?? ""}
        />
      </Field>
      <div className="hidden sm:block" />
      {(
        [
          ["applied_at", partner?.applied_at],
          ["response_due_at", partner?.response_due_at],
          ["responded_at", partner?.responded_at],
          ["approved_at", partner?.approved_at],
          ["terms_accepted_at", partner?.terms_accepted_at],
          ["licence_checked_at", partner?.licence_checked_at],
          ["went_live_at", partner?.went_live_at],
        ] as const
      ).map(([k, v]) => (
        <Field key={k} label={t(`affiliates.f.${k}`)}>
          <Input name={k} type="date" defaultValue={d(v)} />
        </Field>
      ))}
      <Field label={t("affiliates.f.licenceNotes")} className="sm:col-span-2">
        <Input name="licence_notes" defaultValue={d(partner?.licence_notes)} />
      </Field>
      <Field label={t("affiliates.f.notes")} className="sm:col-span-2">
        <Textarea name="notes" rows={3} defaultValue={d(partner?.notes)} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm">
          {t(partner ? "affiliates.save" : "affiliates.add")}
        </Button>
      </div>
    </form>
  );
}

function ActivityLog({ partnerId }: { partnerId: string }) {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data } = useAsync(async () => {
    const { data: rows, error } = await supabase
      .from("affiliate_partner_events")
      .select("id, kind, body, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return rows ?? [];
  }, [partnerId, tick]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = String(f.get("body") ?? "").trim();
    if (!body) return;
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_partner_events").insert({
      partner_id: partnerId,
      kind: String(f.get("kind") ?? "note"),
      body,
      created_by: me.user?.id ?? null,
    });
    if (error) return void toast.error(t("affiliates.error"));
    e.currentTarget.reset();
    setTick((n) => n + 1);
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="text-sm font-semibold">{t("affiliates.log.title")}</h4>
      <form onSubmit={(e) => void add(e)} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-28">
          <Select
            name="kind"
            defaultValue="note"
            options={EVENT_KINDS}
            label={(v) => t(`affiliates.log.kind.${v}`)}
          />
        </div>
        <Input
          name="body"
          maxLength={2000}
          className="min-w-48 flex-1"
          placeholder={t("affiliates.log.placeholder")}
        />
        <Button type="submit" size="sm">
          {t("affiliates.log.add")}
        </Button>
      </form>
      <ul className="mt-3 space-y-2 text-sm">
        {(data ?? []).map((ev) => (
          <li key={ev.id}>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(ev.created_at)} · {t(`affiliates.log.kind.${ev.kind}`)}
            </span>
            <p>{ev.body}</p>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-muted-foreground">{t("affiliates.log.empty")}</li>
        )}
      </ul>
    </div>
  );
}

function Deadline({ partner }: { partner: Partner }) {
  const { t } = useTranslation("admin");
  const open = partner.status === "applied" || partner.status === "info_requested";
  const days = open && !partner.responded_at ? daysUntil(partner.response_due_at) : null;
  if (days === null || !partner.response_due_at) return null;
  const tone = days < 0 ? "text-red-600" : days <= 2 ? "text-amber-600" : "text-muted-foreground";
  return (
    <span className={`text-xs font-semibold ${tone}`}>
      {days < 0
        ? t("affiliates.overdue", { count: Math.abs(days) })
        : days === 0
          ? t("affiliates.dueToday")
          : t("affiliates.dueIn", { count: days })}{" "}
      ({formatDate(partner.response_due_at)})
    </span>
  );
}

export function AffiliatesTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, failed, loading } = useAsync(async () => {
    const { data: rows, error } = await supabase
      .from("affiliate_partners")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return rows ?? [];
  }, [tick]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of data ?? []) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [data]);

  const refresh = () => setTick((n) => n + 1);

  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg">{t("affiliates.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("affiliates.body")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
            {t(adding ? "affiliates.cancel" : "affiliates.new")}
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(["live", "approved", "info_requested", "applied"] as const).map((s) => (
            <div key={s}>
              <dt className="text-xs text-muted-foreground">{t(`affiliates.status.${s}`)}</dt>
              <dd className="text-2xl font-extrabold">{counts[s] ?? 0}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{t("affiliates.rules")}</p>
      </section>

      {adding && (
        <section className={panel}>
          <h3 className="mb-3 text-base">{t("affiliates.new")}</h3>
          <PartnerForm
            onDone={() => {
              setAdding(false);
              refresh();
            }}
          />
        </section>
      )}

      {loading && !data && (
        <p className="text-sm text-muted-foreground">{t("campaigns.loading")}</p>
      )}
      {failed && <p className="text-sm text-destructive">{t("affiliates.loadError")}</p>}

      {data && <CreativesPanel partners={data} />}

      <ul className="space-y-3">
        {(data ?? []).map((p) => (
          <li key={p.id} className={panel}>
            <button
              type="button"
              onClick={() => setOpen(open === p.id ? null : p.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              aria-expanded={open === p.id}
            >
              <span className="min-w-0">
                <span className="block text-base font-semibold">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t(`affiliates.category.${p.category}`)}
                  {p.network ? ` · ${p.network}` : ""}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="border border-border px-2 py-0.5 text-xs font-semibold">
                  {t(`affiliates.status.${p.status}`)}
                </span>
                <Deadline partner={p} />
              </span>
            </button>
            {p.commission_summary && open !== p.id && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {p.commission_summary}
              </p>
            )}
            {p.status === "live" ? null : p.category === "bookmaker" && !p.licence_checked_at ? (
              <p className="mt-2 text-xs text-amber-600">{t("affiliates.licencePending")}</p>
            ) : null}
            {open === p.id && (
              <div className="mt-4 border-t border-border pt-4">
                <PartnerForm partner={p} onDone={refresh} />
                <ActivityLog partnerId={p.id} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Creative = {
  id: string;
  partner_id: string;
  name: string;
  format: string;
  headline: string;
  body: string | null;
  cta_label: string;
  image_url: string | null;
  tracking_link: string | null;
  terms_line: string | null;
  placements: string[];
  weight: number;
  active: boolean;
  approved_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

type AdStat = {
  partner_id: string;
  creative_id: string | null;
  placement: string;
  impressions: number;
  clicks: number;
  dismissals: number;
};

const CREATIVE_FORMATS = ["banner", "card", "text_link", "overlay"] as const;
/** Slots placed in the app (src/components/ads). Empty placements = every slot of that format. */
export const AD_PLACEMENTS = [
  "newsroom-top",
  "newsroom-feed",
  "newsroom-article",
  "newsroom-article-end",
  "teams-grid",
  "bookmakers-list",
  "interstitial",
] as const;

/** Untyped handle: the creatives tables arrive with migration 20261128300000. */
const adsDb = supabase as unknown as SupabaseClient;

function CreativeForm({
  creative,
  partners,
  onDone,
}: {
  creative?: Creative;
  partners: Partner[];
  onDone: () => void;
}) {
  const { t } = useTranslation("admin");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const placements = f.getAll("placements").map(String);
    const weight = Number(f.get("weight") ?? 1);
    const row = {
      partner_id: String(f.get("partner_id") ?? ""),
      name: String(f.get("name") ?? "").trim(),
      format: String(f.get("format") ?? "card"),
      headline: String(f.get("headline") ?? "").trim(),
      body: text(f, "body"),
      cta_label: String(f.get("cta_label") ?? "").trim() || "Visit site",
      image_url: text(f, "image_url"),
      tracking_link: text(f, "tracking_link"),
      terms_line: text(f, "terms_line"),
      placements,
      weight: Number.isInteger(weight) ? Math.min(10, Math.max(1, weight)) : 1,
      active: f.get("active") === "on",
      approved_at: text(f, "approved_at"),
      starts_at: text(f, "starts_at"),
      ends_at: text(f, "ends_at"),
      updated_at: new Date().toISOString(),
    };
    if (!row.partner_id || !row.name || !row.headline)
      return void toast.error(t("affiliates.error"));
    if (row.active && !row.approved_at)
      return void toast.error(t("affiliates.creatives.needApproval"));
    const { error } = creative
      ? await adsDb.from("affiliate_creatives").update(row).eq("id", creative.id)
      : await adsDb.from("affiliate_creatives").insert(row);
    if (error) return void toast.error(t("affiliates.error"));
    toast.success(t("affiliates.saved"));
    if (!creative) e.currentTarget.reset();
    onDone();
  }

  const d = (v: string | null | undefined) => v ?? "";
  const dt = (v: string | null | undefined) => (v ? v.slice(0, 16) : "");
  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("affiliates.creatives.partner")}>
        <select
          name="partner_id"
          defaultValue={creative?.partner_id ?? partners[0]?.id ?? ""}
          className="h-9 w-full border border-input bg-background px-2 text-sm"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({t(`affiliates.status.${p.status}`)})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("affiliates.creatives.name")}>
        <Input name="name" required maxLength={120} defaultValue={d(creative?.name)} />
      </Field>
      <Field label={t("affiliates.creatives.format")}>
        <Select
          name="format"
          defaultValue={creative?.format ?? "card"}
          options={CREATIVE_FORMATS}
          label={(v) => t(`affiliates.creatives.formats.${v}`)}
        />
      </Field>
      <Field label={t("affiliates.creatives.weight")}>
        <Input name="weight" inputMode="numeric" defaultValue={creative?.weight ?? 1} />
      </Field>
      <Field label={t("affiliates.creatives.headline")} className="sm:col-span-2">
        <Input name="headline" required maxLength={90} defaultValue={d(creative?.headline)} />
      </Field>
      <Field label={t("affiliates.creatives.body")} className="sm:col-span-2">
        <Textarea name="body" rows={2} maxLength={220} defaultValue={d(creative?.body)} />
      </Field>
      <Field label={t("affiliates.creatives.cta")}>
        <Input name="cta_label" maxLength={32} defaultValue={d(creative?.cta_label)} />
      </Field>
      <Field label={t("affiliates.creatives.terms")}>
        <Input name="terms_line" maxLength={160} defaultValue={d(creative?.terms_line)} />
      </Field>
      <Field label={t("affiliates.creatives.image")}>
        <Input name="image_url" type="url" defaultValue={d(creative?.image_url)} />
      </Field>
      <Field label={t("affiliates.creatives.link")}>
        <Input name="tracking_link" type="url" defaultValue={d(creative?.tracking_link)} />
      </Field>
      <Field label={t("affiliates.creatives.approvedAt")}>
        <Input name="approved_at" type="date" defaultValue={d(creative?.approved_at)} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-xs">
        <input type="checkbox" name="active" defaultChecked={creative?.active ?? false} />
        {t("affiliates.creatives.active")}
      </label>
      <Field label={t("affiliates.creatives.startsAt")}>
        <Input name="starts_at" type="datetime-local" defaultValue={dt(creative?.starts_at)} />
      </Field>
      <Field label={t("affiliates.creatives.endsAt")}>
        <Input name="ends_at" type="datetime-local" defaultValue={dt(creative?.ends_at)} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs">{t("affiliates.creatives.placements")}</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {AD_PLACEMENTS.map((pl) => (
            <label key={pl} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="placements"
                value={pl}
                defaultChecked={creative?.placements.includes(pl) ?? false}
              />
              {pl}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {t("affiliates.creatives.rules")}
      </p>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm">
          {t(creative ? "affiliates.save" : "affiliates.creatives.add")}
        </Button>
      </div>
    </form>
  );
}

/** Admin > Affiliates: promo creatives per partner, plus 30-day impressions, clicks and CTR. */
export function CreativesPanel({ partners }: { partners: Partner[] }) {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { data } = useAsync(async () => {
    const [c, s] = await Promise.all([
      adsDb.from("affiliate_creatives").select("*").order("created_at"),
      adsDb.rpc("affiliate_ad_stats", { p_days: 30 }),
    ]);
    if (c.error) return { missing: true, creatives: [] as Creative[], stats: [] as AdStat[] };
    return {
      missing: false,
      creatives: (c.data ?? []) as Creative[],
      stats: (s.data ?? []) as AdStat[],
    };
  }, [tick]);
  const refresh = () => setTick((n) => n + 1);
  const name = (id: string) => partners.find((p) => p.id === id)?.name ?? "?";

  const byPartner = useMemo(() => {
    const out = new Map<string, { impressions: number; clicks: number }>();
    for (const s of data?.stats ?? []) {
      const v = out.get(s.partner_id) ?? { impressions: 0, clicks: 0 };
      v.impressions += Number(s.impressions);
      v.clicks += Number(s.clicks);
      out.set(s.partner_id, v);
    }
    return out;
  }, [data]);
  const byCreative = (id: string) =>
    (data?.stats ?? [])
      .filter((s) => s.creative_id === id)
      .reduce((a, s) => ({ i: a.i + Number(s.impressions), c: a.c + Number(s.clicks) }), {
        i: 0,
        c: 0,
      });
  const ctr = (c: number, i: number) => (i > 0 ? `${((c / i) * 100).toFixed(1)}%` : "–");

  if (!data) return null;
  if (data.missing) {
    return (
      <section className={panel}>
        <h3 className="text-base">{t("affiliates.creatives.title")}</h3>
        <p className="mt-2 text-sm text-amber-600">{t("affiliates.creatives.missing")}</p>
      </section>
    );
  }

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base">{t("affiliates.creatives.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("affiliates.creatives.body")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {t(adding ? "affiliates.cancel" : "affiliates.creatives.new")}
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">{t("affiliates.creatives.partner")}</th>
              <th className="py-1 pr-3 font-medium">{t("affiliates.creatives.impressions")}</th>
              <th className="py-1 pr-3 font-medium">{t("affiliates.creatives.clicks")}</th>
              <th className="py-1 font-medium">CTR</th>
            </tr>
          </thead>
          <tbody>
            {partners
              .filter((p) => p.status === "live")
              .map((p) => {
                const s = byPartner.get(p.id) ?? { impressions: 0, clicks: 0 };
                return (
                  <tr key={p.id} className="border-t border-border tnum">
                    <td className="py-1.5 pr-3 font-semibold">{p.name}</td>
                    <td className="py-1.5 pr-3">{s.impressions}</td>
                    <td className="py-1.5 pr-3">{s.clicks}</td>
                    <td className="py-1.5">{ctr(s.clicks, s.impressions)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("affiliates.creatives.statsNote")}
        </p>
      </div>

      {adding && (
        <div className="mt-4 border-t border-border pt-4">
          <CreativeForm
            partners={partners}
            onDone={() => {
              setAdding(false);
              refresh();
            }}
          />
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {data.creatives.map((c) => {
          const s = byCreative(c.id);
          return (
            <li key={c.id} className="border border-border p-3">
              <button
                type="button"
                onClick={() => setOpen(open === c.id ? null : c.id)}
                aria-expanded={open === c.id}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {name(c.partner_id)} · {t(`affiliates.creatives.formats.${c.format}`)} ·{" "}
                    {c.placements.length
                      ? c.placements.join(", ")
                      : t("affiliates.creatives.everywhere")}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs tnum">
                  <span className="text-muted-foreground">
                    {s.i} / {s.c} · {ctr(s.c, s.i)}
                  </span>
                  <span
                    className={`border px-2 py-0.5 font-semibold ${c.active ? "border-primary text-primary" : "border-border"}`}
                  >
                    {t(c.active ? "affiliates.creatives.on" : "affiliates.creatives.off")}
                  </span>
                </span>
              </button>
              {open === c.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <CreativeForm creative={c} partners={partners} onDone={refresh} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
