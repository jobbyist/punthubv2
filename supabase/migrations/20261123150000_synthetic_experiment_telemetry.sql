-- Synthetic QA experiment telemetry.
-- Production guardrail: this schema stores experiment records only. It does not create auth.users,
-- profiles, founding memberships, public picks, PuntPoints, referrals, rewards, or campaign events.
-- All access is service-role only; never expose these tables to the browser.

create table if not exists public.synthetic_experiments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  environment text not null default 'production' check (environment in ('production')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  budget_cap_usd numeric(10,4) not null default 50 check (budget_cap_usd > 0 and budget_cap_usd <= 50),
  reserved_usd numeric(10,4) not null default 0 check (reserved_usd >= 0),
  spent_usd numeric(10,4) not null default 0 check (spent_usd >= 0),
  status text not null default 'paused' check (status in ('paused','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (reserved_usd + spent_usd <= budget_cap_usd + 0.0001)
);

create table if not exists public.synthetic_personas (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.synthetic_experiments(id) on delete cascade,
  persona_key text not null,
  persona jsonb not null check (jsonb_typeof(persona) = 'object'),
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (experiment_id, persona_key)
);

create table if not exists public.synthetic_sessions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.synthetic_experiments(id) on delete cascade,
  persona_key text not null,
  session_type text not null check (session_type in ('read_only_browser','forecast_research')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'started' check (outcome in ('started','passed','failed','skipped')),
  page_paths text[] not null default '{}',
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.synthetic_research (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.synthetic_experiments(id) on delete cascade,
  fixture_key text not null,
  provider text not null default 'parallel-responses',
  response_json jsonb not null,
  source_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (experiment_id, fixture_key)
);

create table if not exists public.synthetic_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.synthetic_experiments(id) on delete cascade,
  request_key text not null unique,
  provider text not null,
  operation text not null,
  estimated_usd numeric(10,4) not null check (estimated_usd > 0),
  settled_usd numeric(10,4),
  status text not null default 'reserved' check (status in ('reserved','settled','failed')),
  provider_request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists synthetic_sessions_experiment_started_idx
  on public.synthetic_sessions (experiment_id, started_at desc);
create index if not exists synthetic_research_experiment_fixture_idx
  on public.synthetic_research (experiment_id, fixture_key);
create index if not exists synthetic_budget_experiment_created_idx
  on public.synthetic_budget_ledger (experiment_id, created_at desc);

alter table public.synthetic_experiments enable row level security;
alter table public.synthetic_personas enable row level security;
alter table public.synthetic_sessions enable row level security;
alter table public.synthetic_research enable row level security;
alter table public.synthetic_budget_ledger enable row level security;

revoke all on public.synthetic_experiments, public.synthetic_personas, public.synthetic_sessions,
  public.synthetic_research, public.synthetic_budget_ledger from public, anon, authenticated;
grant all on public.synthetic_experiments, public.synthetic_personas, public.synthetic_sessions,
  public.synthetic_research, public.synthetic_budget_ledger to service_role;

create or replace function public.reserve_synthetic_budget(
  p_experiment_id uuid,
  p_request_key text,
  p_provider text,
  p_operation text,
  p_estimated_usd numeric
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_experiment public.synthetic_experiments%rowtype;
begin
  if p_estimated_usd is null or p_estimated_usd <= 0 or p_estimated_usd > 0.25 then
    raise exception 'invalid_reservation_amount' using errcode = '22023';
  end if;

  select * into v_experiment
    from public.synthetic_experiments
   where id = p_experiment_id
   for update;

  if not found or v_experiment.status <> 'active' then
    return false;
  end if;

  if now() < v_experiment.starts_at or now() > v_experiment.ends_at then
    return false;
  end if;

  if exists (select 1 from public.synthetic_budget_ledger where request_key = p_request_key) then
    return false;
  end if;

  if v_experiment.spent_usd + v_experiment.reserved_usd + p_estimated_usd > v_experiment.budget_cap_usd then
    return false;
  end if;

  insert into public.synthetic_budget_ledger (
    experiment_id, request_key, provider, operation, estimated_usd
  ) values (
    p_experiment_id, p_request_key, p_provider, p_operation, p_estimated_usd
  );

  update public.synthetic_experiments
     set reserved_usd = reserved_usd + p_estimated_usd,
         updated_at = now()
   where id = p_experiment_id;

  return true;
end;
$$;

create or replace function public.settle_synthetic_budget(
  p_request_key text,
  p_settled_usd numeric default null,
  p_provider_request_id text default null,
  p_failed boolean default false
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger public.synthetic_budget_ledger%rowtype;
  v_charge numeric(10,4);
begin
  select * into v_ledger
    from public.synthetic_budget_ledger
   where request_key = p_request_key
   for update;

  if not found or v_ledger.status <> 'reserved' then
    return false;
  end if;

  -- Provider pricing is not always returned in the response. If absent, retain the conservative
  -- reservation as the charge so the experiment cannot silently exceed its cap.
  v_charge := coalesce(p_settled_usd, v_ledger.estimated_usd);
  if v_charge < 0 or v_charge > 0.25 then
    raise exception 'invalid_settlement_amount' using errcode = '22023';
  end if;

  update public.synthetic_budget_ledger
     set settled_usd = v_charge,
         status = case when p_failed then 'failed' else 'settled' end,
         provider_request_id = p_provider_request_id,
         settled_at = now()
   where id = v_ledger.id;

  update public.synthetic_experiments
     set reserved_usd = greatest(0, reserved_usd - v_ledger.estimated_usd),
         spent_usd = spent_usd + v_charge,
         updated_at = now()
   where id = v_ledger.experiment_id;

  return true;
end;
$$;

revoke all on function public.reserve_synthetic_budget(uuid,text,text,text,numeric) from public, anon, authenticated;
revoke all on function public.settle_synthetic_budget(text,numeric,text,boolean) from public, anon, authenticated;
grant execute on function public.reserve_synthetic_budget(uuid,text,text,text,numeric) to service_role;
grant execute on function public.settle_synthetic_budget(text,numeric,text,boolean) to service_role;

insert into public.synthetic_experiments (
  slug, label, environment, starts_at, ends_at, budget_cap_usd, status
) values (
  'puntr-30-day-synthetic-2026-11-23',
  'Puntr 30-day synthetic QA experiment',
  'production',
  '2026-11-23 00:00:00+02',
  '2026-12-23 00:00:00+02',
  50.00,
  'paused'
)
on conflict (slug) do nothing;
