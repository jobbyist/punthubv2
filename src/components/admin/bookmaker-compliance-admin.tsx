import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bookmakerDirectory, NGB_REGISTER_URL } from "@/lib/bookmaker-directory";
import { supabase } from "@/integrations/supabase/client";

type PermissionRow = {
  id: string; bookmaker_name: string; domain: string | null; affiliate_status: string;
  licence_reference_candidate: string | null; licence_status: "pending_review" | "verified" | "rejected";
  data_rights_status: "pending" | "approved" | "denied"; licence_evidence_url: string | null;
  rights_evidence_url: string | null; collection_approved: boolean; storage_approved: boolean;
  display_approved: boolean; attribution_approved: boolean; retention_approved: boolean;
  redistribution_approved: boolean; automated_access_allowed: boolean; enabled: boolean; notes: string | null;
};

const rights = [
  ["collection_approved", "Collection"],
  ["storage_approved", "Storage/cache"],
  ["display_approved", "Display"],
  ["attribution_approved", "Attribution"],
  ["retention_approved", "Retention"],
  ["redistribution_approved", "Redistribution/comparison"],
] as const;

export function BookmakerComplianceTab() {
  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<PermissionRow>>>({});

  async function refresh() {
    setBusy(true);
    const { data, error } = await supabase.from("bookmaker_odds_permissions").select("*").order("affiliate_priority").order("bookmaker_name");
    if (error) toast.error("Could not load bookmaker permissions.");
    else setRows((data ?? []) as PermissionRow[]);
    setBusy(false);
  }

  useEffect(() => { void refresh(); }, []);

  const directoryRows = useMemo(() => {
    const byName = new Map(rows.map((r) => [r.bookmaker_name.toLowerCase(), r]));
    return bookmakerDirectory.map((entry) => ({ entry, row: byName.get(entry.name.toLowerCase()) }))
      .filter(({ entry }) => entry.name.toLowerCase().includes(filter.toLowerCase()));
  }, [rows, filter]);

  function value(row: PermissionRow, key: keyof PermissionRow) {
    return drafts[row.id]?.[key] ?? row[key];
  }

  function setValue(row: PermissionRow, key: keyof PermissionRow, next: unknown) {
    setDrafts((current) => ({ ...current, [row.id]: { ...current[row.id], [key]: next } }));
  }

  async function save(row: PermissionRow) {
    const draft = drafts[row.id];
    if (!draft) return;
    setSaving(row.id);
    const payload = { ...draft };
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { toast.error("Administrator session expired."); setSaving(null); return; }
    const hasRights = rights.every(([key]) => Boolean(payload[key] ?? row[key]));
    if (payload.enabled === true && (
      (payload.licence_status ?? row.licence_status) !== "verified" ||
      (payload.data_rights_status ?? row.data_rights_status) !== "approved" ||
      !hasRights || (payload.automated_access_allowed ?? row.automated_access_allowed) !== true ||
      !(payload.licence_evidence_url ?? row.licence_evidence_url) ||
      !(payload.rights_evidence_url ?? row.rights_evidence_url)
    )) {
      toast.error("Automation requires verified licensing, written evidence and every data-use permission.");
      setSaving(null);
      return;
    }
    const { error } = await supabase.from("bookmaker_odds_permissions").update({
      ...payload,
      licence_verified_at: payload.licence_status === "verified" ? new Date().toISOString() : undefined,
      rights_reviewed_at: payload.data_rights_status === "approved" ? new Date().toISOString() : undefined,
    }).eq("id", row.id);
    setSaving(null);
    if (error) toast.error("Could not save bookmaker permissions.");
    else {
      toast.success("Bookmaker record saved.");
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; });
      await refresh();
    }
  }

  const approvedCount = rows.filter((r) => r.licence_status === "verified" && r.data_rights_status === "approved" && r.enabled).length;

  return (
    <div className="space-y-5">
      <section className="card-surface space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bookmaker licensing & data-use register</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cross-reference the official register, record written permissions and control source-by-source automation.</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs">{approvedCount} automated sources enabled</span>
        </div>
        <p className="text-sm text-muted-foreground">The National Gambling Board directory is the starting reference, not final legal sign-off. Confirm the current licence, exact legal entity and domain with the relevant provincial regulator. Affiliate approval does not grant odds-data rights.</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="font-medium text-primary underline" href={NGB_REGISTER_URL} target="_blank" rel="noreferrer">NGB verified operators register ↗</a>
          <a className="font-medium text-primary underline" href="https://www.wcgrb.co.za/gambling-devices-2/" target="_blank" rel="noreferrer">Western Cape licence holders ↗</a>
          <a className="font-medium text-primary underline" href="https://mer.org.za/" target="_blank" rel="noreferrer">Mpumalanga Economic Regulator ↗</a>
        </div>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter bookmaker directory…" />
      </section>
      {busy ? <p className="text-sm text-muted-foreground">Loading bookmaker register…</p> : directoryRows.map(({ entry, row }) => (
        <section key={entry.name} className="card-surface space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{entry.name}</h3>
              <p className="text-xs text-muted-foreground">{entry.licenceHolder} · {entry.regulator} · {entry.province}</p>
              <p className="mt-1 text-xs text-muted-foreground">Candidate licence: {entry.licenceReference}</p>
              {entry.verificationNote && <p className="mt-1 text-xs text-amber-700">{entry.verificationNote}</p>}
            </div>
            <span className="text-xs text-muted-foreground">{row ? "Registry record linked" : "Registry record missing"}</span>
          </div>
          {!row ? <p className="text-sm text-muted-foreground">No permissions record exists yet. Apply the bookmaker compliance migration to register this directory entry.</p> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium">Licence verification
                  <select className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" value={value(row,"licence_status") as string} onChange={(e) => setValue(row,"licence_status",e.target.value)}>
                    <option value="pending_review">Pending review</option><option value="verified">Verified</option><option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="text-xs font-medium">Data-use approval
                  <select className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" value={value(row,"data_rights_status") as string} onChange={(e) => setValue(row,"data_rights_status",e.target.value)}>
                    <option value="pending">Pending written approval</option><option value="approved">Approved in writing</option><option value="denied">Denied</option>
                  </select>
                </label>
                <label className="text-xs font-medium sm:col-span-2">Licence evidence URL
                  <Input className="mt-1" value={(value(row,"licence_evidence_url") as string | null) ?? ""} onChange={(e) => setValue(row,"licence_evidence_url",e.target.value || null)} placeholder="Regulator register or licence document URL" />
                </label>
                <label className="text-xs font-medium sm:col-span-2">Written data-rights evidence URL
                  <Input className="mt-1" value={(value(row,"rights_evidence_url") as string | null) ?? ""} onChange={(e) => setValue(row,"rights_evidence_url",e.target.value || null)} placeholder="Bookmaker email, agreement or authorized feed terms" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {rights.map(([key,label]) => <label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(value(row,key))} onChange={(e) => setValue(row,key,e.target.checked)} />{label}</label>)}
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(value(row,"automated_access_allowed"))} onChange={(e) => setValue(row,"automated_access_allowed",e.target.checked)} />Automated access permitted</label>
              </div>
              <label className="block text-xs font-medium">Domain (confirm exact operator website)
                <Input className="mt-1" value={(value(row,"domain") as string | null) ?? ""} onChange={(e) => setValue(row,"domain",e.target.value || null)} placeholder="example.co.za" />
              </label>
              <label className="block text-xs font-medium">Internal notes
                <Input className="mt-1" value={(value(row,"notes") as string | null) ?? ""} onChange={(e) => setValue(row,"notes",e.target.value || null)} placeholder="Contact, restrictions, review date…" />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={Boolean(value(row,"enabled"))} onChange={(e) => setValue(row,"enabled",e.target.checked)} />Enable automated collection</label>
                <Button size="sm" disabled={saving === row.id || !drafts[row.id]} onClick={() => void save(row)}>{saving === row.id ? "Saving…" : "Save record"}</Button>
              </div>
            </>
          )}
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Only 42 operators listed in the curated NGB cross-reference are shown here. The live regulator directory can change; refresh this register after each regulator update. Additional affiliate or candidate operators not in the NGB snapshot remain separately tracked in the odds permissions registry.</p>
    </div>
  );
}
