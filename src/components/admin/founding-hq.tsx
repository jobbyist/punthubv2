import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Handshake,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminAddFoundingHqActivity,
  adminDeleteFoundingHqLead,
  adminFoundingHqOverview,
  adminSaveFoundingHqLead,
  type FoundingHqLead,
} from "@/lib/founding-hq.functions";

const panel = "card-surface border border-border/70 p-4 sm:p-5";
const fieldClass =
  "h-10 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const selectClass =
  "h-10 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const stages = [
  ["new", "New"],
  ["engaged", "Engaged"],
  ["contacted", "Contacted"],
  ["replied", "Replied"],
  ["interested", "Interested"],
  ["link_sent", "Link sent"],
  ["follow_up", "Follow-up"],
  ["registered", "Registered"],
  ["not_interested", "Not interested"],
  ["do_not_contact", "Do not contact"],
] as const;
const segments = [
  ["punter", "Punter"],
  ["tipster", "Tipster"],
  ["hybrid", "Both / hybrid"],
  ["community_admin", "Community admin"],
] as const;
const ambassadorStages = [
  ["not_approached", "Not approached"],
  ["identified", "Identified"],
  ["approached", "Approached"],
  ["in_discussion", "In discussion"],
  ["agreed", "Agreed"],
  ["active", "Active"],
  ["declined", "Declined"],
] as const;
const sources = ["X", "Referral", "Instagram", "Facebook", "WhatsApp", "Direct", "Other"];

type Draft = {
  id?: string;
  displayName: string;
  xHandle: string;
  profileUrl: string;
  segment: string;
  country: string;
  followerCount: string;
  source: string;
  stage: string;
  lastContactedOn: string;
  followUpOn: string;
  registered: boolean;
  isAmbassador: boolean;
  ambassadorStage: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  displayName: "",
  xHandle: "",
  profileUrl: "",
  segment: "punter",
  country: "South Africa",
  followerCount: "",
  source: "X",
  stage: "new",
  lastContactedOn: "",
  followUpOn: "",
  registered: false,
  isAmbassador: false,
  ambassadorStage: "not_approached",
  notes: "",
});

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short" }).format(
    new Date(value.length === 10 ? value + "T12:00:00" : value),
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <section className={panel}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight tnum">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </section>
  );
}

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
    <label className={`block min-w-0 text-xs font-medium text-muted-foreground ${className}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function FoundingHqPage() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminFoundingHqOverview>>>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [activityBody, setActivityBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await adminFoundingHqOverview();
      setOverview(data);
      if (data === null) toast.error("You do not have permission to access Founding HQ.");
    } catch (error) {
      console.error("Founding HQ load failed", error);
      toast.error("Could not load the campaign dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const leads = overview?.leads ?? [];
  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery =
        !q ||
        [lead.displayName, lead.xHandle ?? "", lead.country, lead.source, lead.notes ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
      const matchesSegment = segmentFilter === "all" || lead.segment === segmentFilter;
      return matchesQuery && matchesStage && matchesSegment;
    });
  }, [leads, query, stageFilter, segmentFilter]);

  const warmLeads = leads.filter((lead) =>
    ["interested", "link_sent", "follow_up"].includes(lead.stage),
  ).length;
  const ambassadors = leads.filter((lead) => lead.isAmbassador || lead.ambassadorStage !== "not_approached").length;
  const followUpsDue = leads.filter(
    (lead) =>
      lead.followUpOn &&
      lead.followUpOn <= new Date().toISOString().slice(0, 10) &&
      !["registered", "not_interested", "do_not_contact"].includes(lead.stage),
  ).length;
  const members = overview?.foundingMembers ?? 0;
  const target = overview?.target ?? 100;
  const progress = Math.min(100, (members / target) * 100);
  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);

  function openNew() {
    setDraft(emptyDraft());
    setActivityBody("");
    setModalOpen(true);
  }

  function openEdit(lead: FoundingHqLead) {
    setDraft({
      id: lead.id,
      displayName: lead.displayName,
      xHandle: lead.xHandle ?? "",
      profileUrl: lead.profileUrl ?? "",
      segment: lead.segment,
      country: lead.country,
      followerCount: lead.followerCount === null ? "" : String(lead.followerCount),
      source: lead.source,
      stage: lead.stage,
      lastContactedOn: lead.lastContactedOn ?? "",
      followUpOn: lead.followUpOn ?? "",
      registered: lead.registered,
      isAmbassador: lead.isAmbassador,
      ambassadorStage: lead.ambassadorStage,
      notes: lead.notes ?? "",
    });
    setActivityBody("");
    setModalOpen(true);
  }

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.displayName.trim()) return;
    setSaving(true);
    try {
      const result = await adminSaveFoundingHqLead({
        data: {
          ...draft,
          followerCount: draft.followerCount.trim() ? Number(draft.followerCount) : null,
        },
      });
      if (!result.ok) {
        toast.error(result.message ?? "Could not save this prospect.");
        return;
      }
      if (activityBody.trim()) {
        const activity = await adminAddFoundingHqActivity({
          data: { leadId: result.id, kind: "note", body: activityBody.trim() },
        });
        if (!activity.ok) toast.error(activity.message ?? "Lead saved, but the activity note could not be added.");
      }
      toast.success(draft.id ? "Prospect updated." : "Prospect added.");
      setModalOpen(false);
      await refresh();
    } catch (error) {
      console.error("Founding HQ save failed", error);
      toast.error("Could not save this prospect.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(lead: FoundingHqLead): Promise<boolean> {
    if (!window.confirm(`Delete ${lead.displayName} from the campaign tracker? This also deletes their activity history.`)) return false;
    const result = await adminDeleteFoundingHqLead({ data: { id: lead.id } });
    if (!result.ok) {
      toast.error(result.message ?? "Could not delete prospect.");
      return false;
    }
    toast.success("Prospect deleted.");
    await refresh();
    return true;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="h-8 w-52 animate-pulse bg-muted" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Founding HQ</h1>
        <p className="mt-2 text-sm text-muted-foreground">This campaign workspace is restricted to Puntr administrators.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Puntr growth operations</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Founding HQ<span className="text-primary">.</span></h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your private command centre for the Founding 100 campaign. Track prospects, conversations, conversions and ambassador opportunities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 size-4" /> Add prospect
          </Button>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Founding members" value={`${members} / ${target}`} detail={`${Math.max(0, target - members)} still to go`} icon={Users} />
        <StatCard label="Prospects tracked" value={leads.length} detail="Across all acquisition channels" icon={ClipboardList} />
        <StatCard label="Warm conversations" value={warmLeads} detail="Interested, link sent or follow-up" icon={Activity} />
        <StatCard label="Ambassador pipeline" value={ambassadors} detail="Identified through active" icon={Handshake} />
      </section>

      <section className={`${panel} mt-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Campaign progress</p>
            <p className="mt-1 text-sm font-semibold">{members} verified founding members <span className="font-normal text-muted-foreground">of 100</span></p>
          </div>
          <p className="text-2xl font-extrabold text-primary tnum">{progress.toFixed(0)}%</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>Target: 100 Founding Members</span>
          <span>Launch: 1 December 2026</span>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Prospect pipeline</h2>
              <p className="text-xs text-muted-foreground">Add punters, tipsters, community admins and potential ambassadors.</p>
            </div>
            <span className="text-xs text-muted-foreground">{filteredLeads.length} of {leads.length} shown</span>
          </div>
          <div className={`${panel} mb-3`}>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, X handle, notes..." className="pl-9" />
              </div>
              <select className={selectClass} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Filter by stage">
                <option value="all">All stages</option>
                {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className={selectClass} value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} aria-label="Filter by audience">
                <option value="all">All audiences</option>
                {segments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredLeads.length === 0 ? (
              <div className={`${panel} py-10 text-center`}>
                <Users className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No prospects found</p>
                <p className="mt-1 text-sm text-muted-foreground">Add your first prospect or adjust the filters.</p>
                <Button className="mt-4" size="sm" onClick={openNew}><Plus className="mr-2 size-4" /> Add prospect</Button>
              </div>
            ) : filteredLeads.map((lead) => (
              <article key={lead.id} className={`${panel} transition hover:border-primary/40`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{lead.displayName}</h3>
                      {lead.xHandle && <span className="text-xs text-muted-foreground">@{lead.xHandle}</span>}
                      {lead.isAmbassador && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Ambassador</span>}
                      {lead.registered && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Registered</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{segments.find(([v]) => v === lead.segment)?.[1] ?? lead.segment}</span>
                      <span>{lead.country}</span>
                      <span>{lead.followerCount === null ? "Audience n/a" : `${lead.followerCount.toLocaleString("en-ZA")} followers`}</span>
                      <span>Source: {lead.source}</span>
                    </div>
                    {lead.notes && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lead.notes}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{stages.find(([v]) => v === lead.stage)?.[1] ?? lead.stage}</span>
                      {lead.followUpOn && <span className={lead.followUpOn <= new Date().toISOString().slice(0,10) ? "font-semibold text-amber-600" : "text-muted-foreground"}><CalendarClock className="mr-1 inline size-3.5" /> Follow-up {dateLabel(lead.followUpOn)}</span>}
                      {lead.ambassadorStage !== "not_approached" && <span className="text-primary">Ambassador: {ambassadorStages.find(([v]) => v === lead.ambassadorStage)?.[1]}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {lead.profileUrl && <Button asChild size="sm" variant="outline"><a href={lead.profileUrl} target="_blank" rel="noreferrer">Profile <ArrowUpRight className="ml-1 size-3.5" /></a></Button>}
                    <Button size="sm" variant="outline" onClick={() => openEdit(lead)}>Manage</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className={panel}>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              <h2 className="font-bold">Follow-up queue</h2>
            </div>
            <p className="mt-2 text-3xl font-extrabold tnum">{followUpsDue}</p>
            <p className="text-xs text-muted-foreground">Due today or overdue</p>
            <div className="mt-3 space-y-2">
              {leads.filter((lead) => lead.followUpOn && lead.followUpOn <= new Date().toISOString().slice(0,10) && !["registered","not_interested","do_not_contact"].includes(lead.stage)).slice(0,5).map((lead) => (
                <button type="button" key={lead.id} onClick={() => openEdit(lead)} className="flex w-full items-center justify-between gap-2 border-t border-border pt-2 text-left text-sm hover:text-primary">
                  <span className="truncate font-medium">{lead.displayName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{dateLabel(lead.followUpOn)}</span>
                </button>
              ))}
              {followUpsDue === 0 && <p className="border-t border-border pt-3 text-sm text-muted-foreground">You're up to date. Add follow-up dates when you contact prospects.</p>}
            </div>
          </section>

          <section className={panel}>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <h2 className="font-bold">Acquisition sources</h2>
            </div>
            {sourceCounts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Your source breakdown will appear as you add prospects.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {sourceCounts.map(([source, count]) => (
                  <div key={source}>
                    <div className="mb-1 flex justify-between text-xs"><span>{source}</span><span className="font-semibold tnum">{count}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / Math.max(1, leads.length)) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={panel}>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="font-bold">Recent activity</h2>
            </div>
            <div className="mt-3 space-y-3">
              {(overview.activities ?? []).slice(0,8).map((activity) => {
                const lead = leads.find((item) => item.id === activity.leadId);
                return (
                  <div key={activity.id} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-xs font-semibold">{lead?.displayName ?? "Prospect"} · {activity.kind}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{activity.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{dateLabel(activity.createdAt)}</p>
                  </div>
                );
              })}
              {(overview.activities ?? []).length === 0 && <p className="text-sm text-muted-foreground">Your outreach notes and meeting updates will appear here.</p>}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-7 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Private workspace · Puntr administrators only · Data saved to Supabase</span>
        <a className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" href="https://puntr.co.za/founding" target="_blank" rel="noreferrer">Open public Founding page <ArrowUpRight className="size-3.5" /></a>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="lead-form-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:rounded-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Prospect management</p>
                <h2 id="lead-form-title" className="mt-1 text-xl font-bold">{draft.id ? "Manage prospect" : "Add a prospect"}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Record only relevant public profile and campaign information.</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setModalOpen(false)}><X className="size-4" /></Button>
            </div>

            <form onSubmit={(event) => void saveLead(event)} className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Name / display name"><Input required value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="e.g. Floss Reigh" /></Field>
              <Field label="X handle"><Input value={draft.xHandle} onChange={(e) => setDraft({ ...draft, xHandle: e.target.value })} placeholder="@username" /></Field>
              <Field label="Profile URL"><Input type="url" value={draft.profileUrl} onChange={(e) => setDraft({ ...draft, profileUrl: e.target.value })} placeholder="https://x.com/username" /></Field>
              <Field label="Follower count"><Input inputMode="numeric" value={draft.followerCount} onChange={(e) => setDraft({ ...draft, followerCount: e.target.value.replace(/[^0-9]/g, "") })} placeholder="e.g. 95000" /></Field>
              <Field label="Audience type"><select className={selectClass} value={draft.segment} onChange={(e) => setDraft({ ...draft, segment: e.target.value })}>{segments.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Country / market"><Input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></Field>
              <Field label="Acquisition source"><select className={selectClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>{sources.map((source) => <option key={source}>{source}</option>)}</select></Field>
              <Field label="Pipeline stage"><select className={selectClass} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>{stages.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Last contacted"><Input type="date" value={draft.lastContactedOn} onChange={(e) => setDraft({ ...draft, lastContactedOn: e.target.value })} /></Field>
              <Field label="Next follow-up"><Input type="date" value={draft.followUpOn} onChange={(e) => setDraft({ ...draft, followUpOn: e.target.value })} /></Field>
              <Field label="Ambassador stage"><select className={selectClass} value={draft.ambassadorStage} onChange={(e) => setDraft({ ...draft, ambassadorStage: e.target.value })}>{ambassadorStages.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.registered} onChange={(e) => setDraft({ ...draft, registered: e.target.checked, stage: e.target.checked ? "registered" : draft.stage })} className="size-4 accent-primary" /> Verified founding member</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isAmbassador} onChange={(e) => setDraft({ ...draft, isAmbassador: e.target.checked })} className="size-4 accent-primary" /> Ambassador prospect / partner</label>
              </div>
              <Field label="Prospect notes" className="sm:col-span-2"><Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Relevant post, engagement quality, audience fit, conversation context..." /></Field>
              <Field label={draft.id ? "Add activity note (optional)" : "Initial activity note (optional)"} className="sm:col-span-2"><Textarea rows={2} value={activityBody} onChange={(e) => setActivityBody(e.target.value)} placeholder="e.g. Replied to their post about the PSL; invited them to a private platform tour..." /></Field>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 sm:col-span-2">
                <div>{draft.id && <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { const lead = leads.find((item) => item.id === draft.id); if (lead) void deleteLead(lead).then((deleted) => { if (deleted) setModalOpen(false); }); }}><Trash2 className="mr-2 size-4" /> Delete</Button>}</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving || draft.displayName.trim().length < 2}>{saving ? "Saving..." : draft.id ? "Save changes" : "Add prospect"}</Button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
