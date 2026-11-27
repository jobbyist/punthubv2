-- PFIE learning pipeline: synthetic QA contributes operational learning immediately;
-- forecast examples remain quarantined until independently corroborated by PFIE.
create table if not exists public.pfie_learning_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sessions_seen integer not null default 0,
  research_seen integer not null default 0,
  examples_inserted integer not null default 0,
  examples_updated integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.pfie_learning_examples (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('synthetic_session','synthetic_research')),
  source_id text not null,
  experiment_id uuid references public.synthetic_experiments(id) on delete set null,
  fixture_key text,
  task_type text not null check (task_type in ('route_quality','forecast_evaluation')),
  payload jsonb not null default '{}'::jsonb,
  label jsonb,
  label_status text not null default 'pending_verification'
    check (label_status in ('pending_verification','verified','rejected','not_applicable')),
  training_status text not null default 'quarantined'
    check (training_status in ('quarantined','approved','excluded')),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (source_kind, source_id, task_type)
);

create index if not exists pfie_learning_examples_status_idx
  on public.pfie_learning_examples (task_type, training_status, label_status, created_at desc);
create index if not exists pfie_learning_examples_fixture_idx
  on public.pfie_learning_examples (fixture_key) where fixture_key is not null;

alter table public.pfie_learning_ingest_runs enable row level security;
alter table public.pfie_learning_examples enable row level security;
revoke all on public.pfie_learning_ingest_runs from anon, authenticated;
revoke all on public.pfie_learning_examples from anon, authenticated;
grant all on public.pfie_learning_ingest_runs to service_role;
grant all on public.pfie_learning_examples to service_role;

-- Only approved, verified examples enter the canonical training/evaluation dataset.
create or replace view public.pfie_training_dataset
with (security_invoker = true) as
select id, task_type, source_kind, fixture_key, payload, label, provenance, created_at, reviewed_at
from public.pfie_learning_examples
where training_status = 'approved' and label_status = 'verified';

revoke all on public.pfie_training_dataset from anon, authenticated;
grant select on public.pfie_training_dataset to service_role;

-- A forecast label is approved only when PFIE has accepted two independent official/trusted
-- source observations for the same fixture and score. Synthetic model output is never its own label.
create or replace function public.admin_approve_pfie_learning_example(p_example_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_example public.pfie_learning_examples%rowtype;
  v_home text;
  v_away text;
  v_kickoff timestamptz;
  v_home_score integer;
  v_away_score integer;
  v_domains integer;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select * into v_example
  from public.pfie_learning_examples
  where id = p_example_id
    and task_type = 'forecast_evaluation'
    and training_status = 'quarantined'
    and label_status = 'pending_verification'
  for update;

  if not found then
    raise exception 'example_not_eligible_for_review';
  end if;

  v_home := v_example.payload #>> '{fixture_context,home_team}';
  v_away := v_example.payload #>> '{fixture_context,away_team}';
  v_kickoff := nullif(v_example.payload #>> '{fixture_context,kickoff_utc}', '')::timestamptz;

  if v_home is null or v_away is null or v_kickoff is null then
    raise exception 'fixture_context_incomplete';
  end if;

  select o.home_score, o.away_score, count(distinct lower(regexp_replace(o.domain, '^www\\.', '')))
    into v_home_score, v_away_score, v_domains
  from public.pfie_observations o
  where o.accepted = true
    and o.tier in ('official','trusted')
    and o.home_score is not null
    and o.away_score is not null
    and lower(trim(o.home)) = lower(trim(v_home))
    and lower(trim(o.away)) = lower(trim(v_away))
    and abs(extract(epoch from (o.kickoff_utc - v_kickoff))) <= 86400
  group by o.home_score, o.away_score
  order by count(distinct lower(regexp_replace(o.domain, '^www\\.', ''))) desc
  limit 1;

  if v_domains is null or v_domains < 2 then
    raise exception 'two_independent_pfie_sources_required';
  end if;

  update public.pfie_learning_examples
  set label = jsonb_build_object(
        'home_score', v_home_score,
        'away_score', v_away_score,
        'result', case when v_home_score > v_away_score then 'home' when v_home_score < v_away_score then 'away' else 'draw' end,
        'verified_source_count', v_domains
      ),
      label_status = 'verified',
      training_status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_example_id;

  return true;
end;
$$;

revoke all on function public.admin_approve_pfie_learning_example(uuid) from public, anon;
grant execute on function public.admin_approve_pfie_learning_example(uuid) to authenticated;
