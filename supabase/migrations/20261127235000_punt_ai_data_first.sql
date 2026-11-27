create table if not exists public.punt_ai_cache (
  cache_key text primary key,
  mode text not null check (mode in ('internal', 'live_web')),
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  model text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists punt_ai_cache_expires_at on public.punt_ai_cache(expires_at);

create table if not exists public.punt_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('internal', 'live_web')),
  cache_key text not null,
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  cache_hit boolean not null default false,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists punt_ai_usage_user_created
  on public.punt_ai_usage(user_id, created_at desc);

alter table public.punt_ai_cache enable row level security;
alter table public.punt_ai_usage enable row level security;
revoke all on public.punt_ai_cache from anon, authenticated;
revoke all on public.punt_ai_usage from anon, authenticated;
grant all on public.punt_ai_cache to service_role;
grant all on public.punt_ai_usage to service_role;

create or replace function public.punt_ai_claim(
  p_user uuid,
  p_mode text,
  p_cache_key text
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_day_start timestamptz;
  v_day_count integer;
  v_hour_count integer;
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_mode not in ('internal', 'live_web')
     or p_cache_key is null
     or char_length(p_cache_key) not between 8 and 120 then
    raise exception 'invalid_punt_ai_request' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user and is_ai_participant = false and is_banned = false
  ) then
    raise exception 'member_not_eligible' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('punt-ai:' || p_user::text));
  v_day_start := date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg';
  select
    count(*) filter (where created_at >= v_day_start),
    count(*) filter (where created_at >= now() - interval '1 hour')
  into v_day_count, v_hour_count
  from public.punt_ai_usage
  where user_id = p_user and created_at >= least(v_day_start, now() - interval '1 hour');

  if v_day_count >= 60 or v_hour_count >= 12 then
    return null;
  end if;

  insert into public.punt_ai_usage(user_id, mode, cache_key)
  values (p_user, p_mode, p_cache_key)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.punt_ai_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.punt_ai_claim(uuid, text, text) to service_role;

insert into public.credit_prices(feature, title, credits, active)
values ('punt_ai_live', 'PUNT AI live web answer', 2, true)
on conflict (feature) do update
set title = excluded.title, credits = excluded.credits, active = true;
