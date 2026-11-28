import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import {
  adminPlatformUpdatesOverview,
  adminSavePlatformTask,
  adminSyncPlatformUpdates,
  type PlatformTask,
  type SavePlatformTaskInput,
} from "@/lib/platform-updates.functions";
import { formatDate, formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const statuses: PlatformTask["status"][] = [
  "planned",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
];
const priorities: PlatformTask["priority"][] = ["low", "medium", "high", "critical"];
const pfiePhases = [
  {
    number: "01",
    title: "Phase 1 — Production audit & issue register",
    summary: "Establish an evidence-backed baseline across GitHub, Supabase, Vercel, PFIE ingestion, source quality and API expenditure.",
    priority: "critical",
    sortOrder: -600,
    criteria: [
      "Record the current main commit and production Vercel deployment.",
      "Audit all ten launch competitions across fixtures, results, standings, history and source corroboration.",
      "Identify stale tables, failed jobs, unresolved fixtures, duplicate records and data-integrity risks.",
      "Audit Parallel usage, attribution, quotas, monthly family budgets and the $200 cumulative allowance through 31 March 2027.",
      "Reconcile Supabase schema, migrations, RLS, grants, cron schedules and learning-data views.",
      "Classify every finding by severity, evidence, affected component and remediation phase.",
    ],
  },
  {
    number: "02",
    title: "Phase 2 — Ten-competition data reliability",
    summary: "Repair fixture, result, standings and historical ingestion without relaxing deterministic validation.",
    priority: "critical",
    sortOrder: -599,
    criteria: [
      "Stabilise Betway Premiership, Premier League, EFL Championship, La Liga, UCL, UECL, Bundesliga, Serie A, Ligue 1 and CAF Confederation Cup.",
      "Keep Saudi Pro League and Liga Portugal deferred; prevent non-priority PFIE jobs from consuming launch budget.",
      "Require fresh, complete and independently corroborated standings before replacing persisted tables.",
      "Verify fixture identity, kickoff, status, final scores, postponements, rescheduling and historical reconciliation.",
      "Preserve idempotency, canonical team matching, provenance and safe handling of disputed data.",
      "Pass regression tests for all repaired failure cases and verify successful production syncs.",
    ],
  },
  {
    number: "03",
    title: "Phase 3 — Parallel budget & consumption controls",
    summary: "Make every external request attributable, budget-aware, deduplicated and safe under quota exhaustion.",
    priority: "critical",
    sortOrder: -598,
    criteria: [
      "Keep PFIE on Parallel Search, Extract and Responses only; prohibit silent Gemini or Firecrawl fallbacks.",
      "Attribute usage and estimated cost to PFIE feature, operation, competition and job run.",
      "Reduce repeated searches/extractions through cache reuse, request deduplication and bounded source reads.",
      "Apply backoff and stop retries when a provider or spend ceiling is exhausted.",
      "Enforce provider-family budgets and the shared $200 cumulative cap through 31 March 2027.",
      "Demonstrate a sustainable daily run-rate without increasing the approved budget.",
    ],
  },
  {
    number: "04",
    title: "Phase 4 — Admin observability & controls",
    summary: "Give administrators a reliable operational view of PFIE health, provenance, schedules and spend.",
    priority: "high",
    sortOrder: -597,
    criteria: [
      "Show fixture, result, standings and history job health with last success, last attempt and consecutive failures.",
      "Show source provenance, validation outcomes, disagreements and rejected records.",
      "Show Parallel calls, estimated spend, quotas, remaining budget and budget alerts by feature.",
      "Show scheduler status, next run, failures and controlled recovery actions.",
      "Keep operational secrets and privileged data server-side and restrict controls to verified administrators.",
    ],
  },
  {
    number: "05",
    title: "Phase 5 — First-party learning-data integrity",
    summary: "Make real, consented member activity the primary learning source, with verified outcomes as ground truth and synthetic QA secondary.",
    priority: "high",
    sortOrder: -596,
    criteria: [
      "Use real opted-in member activity as the primary behavioural learning source from 1 December 2026.",
      "Use independently verified match outcomes as ground-truth labels.",
      "Keep synthetic sessions and research isolated as secondary QA; do not let them silently dominate the training dataset.",
      "Preserve consent checks, pseudonymous subject keys, deletion/export controls and retention rules.",
      "Keep raw personal identifiers out of model prompts, exports and general analytics.",
      "Verify that the learning dashboard and dataset views reflect the intended source hierarchy.",
    ],
  },
  {
    number: "06",
    title: "Phase 6 — Production verification & launch sign-off",
    summary: "Prove the fixes in Vercel previews and production, then record evidence before declaring PFIE ready.",
    priority: "high",
    sortOrder: -595,
    criteria: [
      "Run targeted regression tests and the applicable full-suite checks for each change.",
      "Require the exact PR head SHA to receive a Vercel preview marked READY before merge.",
      "Do not use GitHub Actions as a PR acceptance gate.",
      "Verify the production deployment, scheduled jobs, Supabase records and persisted data after merge.",
      "Confirm all ten competition acceptance criteria and the Parallel budget guardrails.",
      "Record merged changes, test evidence, production verification and remaining risks in mvp.md.",
    ],
  },
] as const;

const emptyDraft: SavePlatformTaskInput = {
  title: "",
  description: "",
  category: "Platform",
  status: "planned",
  priority: "medium",
  progress: 0,
  dueDate: "",
  sortOrder: 0,
};

function statusLabel(status: PlatformTask["status"]) {
  return {
    planned: "Planned",
    in_progress: "In progress",
    blocked: "Blocked",
    completed: "Completed",
    cancelled: "Cancelled",
  }[status];
}
function priorityLabel(priority: PlatformTask["priority"]) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function PlatformUpdatesTab() {
  const [tick, setTick] = useState(0);
  const { data, loading, failed } = useAsync(() => adminPlatformUpdatesOverview(), [tick]);
  const [updateSearch, setUpdateSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("all");
  const [draft, setDraft] = useState<SavePlatformTaskInput>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Keep the admin tracker current when a task, audit event or merged-PR record changes.
  // The server function remains the only read path; realtime events merely invalidate the snapshot.
  useEffect(() => {
    const channel = supabase
      .channel("admin-platform-updates-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_implementation_tasks" },
        () => setTick((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_implementation_task_events" },
        () => setTick((n) => n + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_updates" },
        () => setTick((n) => n + 1),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredUpdates = useMemo(() => {
    const q = updateSearch.trim().toLowerCase();
    return (data?.updates ?? []).filter(
      (u) =>
        !q || [u.title, u.summary, String(u.prNumber)].some((v) => v.toLowerCase().includes(q)),
    );
  }, [data?.updates, updateSearch]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return (data?.tasks ?? []).filter(
      (task) =>
        (taskStatus === "all" || task.status === taskStatus) &&
        (!q ||
          [task.title, task.description, task.category, task.status, task.priority].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [data?.tasks, taskSearch, taskStatus]);

  const counts = useMemo(() => {
    const tasks = data?.tasks ?? [];
    return {
      planned: tasks.filter((t) => t.status === "planned").length,
      active: tasks.filter((t) => t.status === "in_progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }, [data?.tasks]);

  const pfiePhaseTasks = useMemo(
    () => pfiePhases.map((phase) => data?.tasks.find((task) => task.title === phase.title)),
    [data?.tasks],
  );
  const pfieOverallProgress = Math.round(
    pfiePhaseTasks.reduce((sum, task) => sum + (task?.progress ?? 0), 0) / pfiePhases.length,
  );


  function startEdit(task: PlatformTask) {
    setDraft({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      priority: task.priority,
      progress: task.progress,
      dueDate: task.dueDate ?? "",
      sortOrder: task.sortOrder,
    });
    setEditingId(task.id);
    setShowForm(true);
  }

  function newTask() {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(true);
  }

  async function syncHistory() {
    setSyncing(true);
    try {
      const result = await adminSyncPlatformUpdates();
      if (!result.ok) toast.error(result.message);
      else {
        toast.success(`Synced ${result.synced} merged pull requests from GitHub.`);
        setTick((n) => n + 1);
      }
    } catch {
      toast.error("Could not sync repository history.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await adminSavePlatformTask({ data: draft });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(editingId ? "Implementation task updated." : "Implementation task added.");
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft);
      setTick((n) => n + 1);
    } catch {
      toast.error("Could not save the implementation task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Repository record
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">Platform Updates</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Search the merged pull-request history and manage the forward implementation queue
              from one admin workspace.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={() => void syncHistory()}
            >
              {syncing ? "Syncing…" : "Sync GitHub history"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTick((n) => n + 1)}>
              Refresh
            </Button>
          </div>
        </div>
        {failed && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not load platform updates. Check the migration and admin permissions.
          </p>
        )}
        {loading && !data && (
          <p className="mt-3 text-sm text-muted-foreground">Loading repository history…</p>
        )}
        {data && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Merged PRs</p>
              <p className="mt-1 text-2xl font-bold tnum">{data.updates.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Planned</p>
              <p className="mt-1 text-2xl font-bold tnum">{counts.planned}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">In progress</p>
              <p className="mt-1 text-2xl font-bold tnum">{counts.active}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-bold tnum">{counts.completed}</p>
            </div>
          </div>
        )}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Six-phase delivery programme
            </p>
            <h3 className="mt-1 font-display text-lg font-bold">PFIE Production Readiness</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Track the audit, ten-competition reliability work, Parallel budget controls, admin observability,
              first-party learning pipeline and production sign-off from this workspace.
            </p>
          </div>
          <div className="min-w-28 rounded-lg border border-border px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Programme progress</p>
            <p className="text-2xl font-bold tnum">{pfieOverallProgress}%</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: pfieOverallProgress + "%" }} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {pfiePhases.map((phase, index) => {
            const task = pfiePhaseTasks[index];
            const status = task?.status ?? "planned";
            const progress = task?.progress ?? 0;
            return (
              <article key={phase.number} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {phase.number} / 06
                    </p>
                    <h4 className="mt-1 font-semibold">{phase.title}</h4>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px]">
                    {statusLabel(status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{phase.summary}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: progress + "%" }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold tnum">{progress}%</span>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-primary">
                    Acceptance criteria
                  </summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                    {phase.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
                  </ul>
                </details>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (task) {
                        startEdit(task);
                        return;
                      }
                      setDraft({
                        ...emptyDraft,
                        title: phase.title,
                        category: "PFIE Production Readiness",
                        priority: phase.priority,
                        description: phase.criteria.map((criterion) => "- " + criterion).join("\n"),
                        sortOrder: phase.sortOrder,
                      });
                      setEditingId(null);
                      setShowForm(true);
                    }}
                  >
                    {task ? "Update phase" : "Create tracker"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Implementation checklist</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add planned work, set ownership-ready priorities and target dates, and track progress
              through completion.
            </p>
          </div>
          <Button size="sm" onClick={newTask}>
            Add implementation task
          </Button>
        </div>
        {showForm && (
          <form
            onSubmit={(e) => void saveTask(e)}
            className="mt-4 space-y-3 rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">
                {editingId ? "Update implementation task" : "New implementation task"}
              </h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Close
              </Button>
            </div>
            <Input
              required
              minLength={3}
              maxLength={180}
              placeholder="Task title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <Textarea
              rows={3}
              maxLength={5000}
              placeholder="Scope, acceptance criteria, dependencies and notes…"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                maxLength={80}
                placeholder="Category"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              />
              <select
                className={selectClass}
                aria-label="Task status"
                value={draft.status}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    status: e.target.value as PlatformTask["status"],
                    progress: e.target.value === "completed" ? 100 : d.progress,
                  }))
                }
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                aria-label="Task priority"
                value={draft.priority}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priority: e.target.value as PlatformTask["priority"] }))
                }
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p)}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                aria-label="Target date"
                value={draft.dueDate}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_8rem]">
              <label className="text-sm text-muted-foreground">Implementation progress</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.status === "completed" ? 100 : draft.progress}
                onChange={(e) => setDraft((d) => ({ ...d, progress: Number(e.target.value) }))}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: (draft.status === "completed" ? 100 : draft.progress) + "%" }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Add task"}
              </Button>
            </div>
          </form>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
          <Input
            placeholder="Search tasks by title, scope or category…"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
          />
          <select
            className={selectClass}
            aria-label="Filter tasks by status"
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 space-y-3">
          {filteredTasks.map((task) => (
            <article key={task.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{task.title}</h4>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                      {statusLabel(task.status)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {priorityLabel(task.priority)} priority
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.category}
                    {task.dueDate ? " · Target " + formatDate(task.dueDate) : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => startEdit(task)}>
                  Edit
                </Button>
              </div>
              {task.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {task.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: task.progress + "%" }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-semibold tnum">{task.progress}%</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Updated {formatDateTime(task.updatedAt)}
                {task.completedAt ? " · Completed " + formatDateTime(task.completedAt) : ""}
              </p>
            </article>
          ))}
          {data && filteredTasks.length === 0 && (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No tasks match these filters yet.
            </p>
          )}
        </div>
        {(data?.events ?? []).length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Recent implementation activity</h4>
            <ul className="mt-2 divide-y divide-border">
              {(data?.events ?? []).slice(0, 12).map((event) => {
                const task = data?.tasks.find((item) => item.id === event.taskId);
                const after = event.detail["after"] as Record<string, unknown> | undefined;
                return (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                  >
                    <span>
                      <b>{task?.title ?? "Implementation task"}</b> · {event.eventType}
                      {after?.["status"]
                        ? " · " + statusLabel(after["status"] as PlatformTask["status"])
                        : ""}
                      {after?.["progress"] !== undefined
                        ? " · " + String(after["progress"]) + "%"
                        : ""}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Implemented repository updates</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every merged pull request in the repository archive, linked to its original GitHub
              record.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredUpdates.length} of {data?.updates.length ?? 0} records
          </p>
        </div>
        <Input
          className="mt-4"
          placeholder="Search PR number, title or implementation summary…"
          value={updateSearch}
          onChange={(e) => setUpdateSearch(e.target.value)}
        />
        <div className="mt-4 divide-y divide-border">
          {filteredUpdates.map((update) => (
            <article key={update.prNumber} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    PR #{update.prNumber} · {formatDate(update.mergedAt)}
                  </p>
                  <h4 className="mt-1 font-semibold">{update.title}</h4>
                </div>
                <a
                  className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  href={update.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View PR ↗
                </a>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {update.summary}
              </p>
            </article>
          ))}
          {data && filteredUpdates.length === 0 && (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No merged updates match that search.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}