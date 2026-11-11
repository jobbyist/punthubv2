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
