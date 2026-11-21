-- Temporary, admin-only CRM for the Puntr Founding 100 acquisition campaign.
create table if not exists public.founding_hq_leads (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  x_handle text,
  profile_url text,
  segment text not null default 'punter' check (segment in ('punter','tipster','hybrid','community_admin')),
  country text not null default 'South Africa',
  follower_count bigint check (follower_count is null or follower_count >= 0),
  source text not null default 'X',
  stage text not null default 'new' check (stage in ('new','engaged','contacted','replied','interested','link_sent','follow_up','registered','not_interested','do_not_contact')),
  last_contacted_on date,
  follow_up_on date,
  registered boolean not null default false,
  is_ambassador boolean not null default false,
  ambassador_stage text not null default 'not_approached' check (ambassador_stage in ('not_approached','identified','approached','in_discussion','agreed','active','declined')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists founding_hq_leads_stage_idx on public.founding_hq_leads(stage);
create index if not exists founding_hq_leads_follow_up_idx on public.founding_hq_leads(follow_up_on) where follow_up_on is not null;
create index if not exists founding_hq_leads_created_at_idx on public.founding_hq_leads(created_at desc);

create table if not exists public.founding_hq_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.founding_hq_leads(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','reply','meeting','status','referral','other')),
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists founding_hq_activities_lead_idx on public.founding_hq_activities(lead_id, created_at desc);

alter table public.founding_hq_leads enable row level security;
alter table public.founding_hq_activities enable row level security;

drop policy if exists "Admins manage founding HQ leads" on public.founding_hq_leads;
create policy "Admins manage founding HQ leads"
  on public.founding_hq_leads for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage founding HQ activities" on public.founding_hq_activities;
create policy "Admins manage founding HQ activities"
  on public.founding_hq_activities for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.founding_hq_leads from anon, public;
revoke all on public.founding_hq_activities from anon, public;
grant select, insert, update, delete on public.founding_hq_leads to authenticated, service_role;
grant select, insert, update, delete on public.founding_hq_activities to authenticated, service_role;


-- Keep updated_at correct even for updates performed outside the dashboard server function.
create or replace function public.founding_hq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists founding_hq_leads_touch_updated_at on public.founding_hq_leads;
create trigger founding_hq_leads_touch_updated_at
  before update on public.founding_hq_leads
  for each row execute function public.founding_hq_touch_updated_at();

revoke all on function public.founding_hq_touch_updated_at() from public, anon, authenticated;
