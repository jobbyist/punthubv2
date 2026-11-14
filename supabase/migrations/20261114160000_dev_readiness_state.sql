-- /dev MVP readiness checklist: tick state for manual tasks. The catalogue (titles, weights) lives in
-- src/lib/mvp-readiness.ts; a row here overrides that task's default. Written only by the server after the
-- /dev gate (service role). RLS on with no policies: anon and authenticated can neither read nor write.
create table if not exists public.dev_readiness_state (
  task_id text primary key check (task_id ~ '^[a-z0-9-]{1,64}$'),
  done boolean not null,
  updated_at timestamptz not null default now()
);

alter table public.dev_readiness_state enable row level security;

revoke all on public.dev_readiness_state from anon, authenticated;
grant select, insert, update, delete on public.dev_readiness_state to service_role;

comment on table public.dev_readiness_state is
  'Team-only /dev launch checklist state (manual tasks). Catalogue in src/lib/mvp-readiness.ts.';
