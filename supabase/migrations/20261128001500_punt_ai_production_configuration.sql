-- PUNT AI production storage, user-level usage guard and live-web credit price.
-- The UI remains behind SHOW_PUNT_AI_CHAT until launch approval.

create table if not exists public.punt_ai_cache (
  cache_key text primary key,
  mode text not null check (mode in ('internal', 'live_web')),
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  model text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists punt_ai_cache_expiry_idx
  on public.punt_ai_cache (expires_at);

create table if not exists public.punt_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('internal', 'live_web')),
  cache_key text not null,
  status text not null default 'started'
    check (status in ('started', 'completed', 'failed')),
  cache_hit boolean not null default false,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists punt_ai_usage_user_created_idx
  on public.punt_ai_usage (user_id, created_at desc);
create index if not exists punt_ai_usage_created_idx
  on public.punt_ai_usage (created_at desc);

create or replace function public.punt_ai_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists punt_ai_cache_touch_updated_at on public.punt_ai_cache;
create trigger punt_ai_cache_touch_updated_at
  before update on public.punt_ai_cache
  for each row execute function public.punt_ai_touch_updated_at();

drop trigger if exists punt_ai_usage_touch_updated_at on public.punt_ai_usage;
create trigger punt_ai_usage_touch_updated_at
  before update on public.punt_ai_usage
  for each row execute function public.punt_ai_touch_updated_at();

alter table public.punt_ai_cache enable row level security;
alter table public.punt_ai_usage enable row level security;
revoke all on public.punt_ai_cache, public.punt_ai_usage from anon, authenticated;
grant all on public.punt_ai_cache, public.punt_ai_usage to service_role;

insert into public.app_settings (key, value) values
  ('punt_ai_free_daily_cap', '20'),
  ('punt_ai_free_monthly_cap', '300'),
  ('punt_ai_pro_daily_cap', '40'),
  ('punt_ai_pro_monthly_cap', '600')
on conflict (key) do nothing;

create or replace function public.punt_ai_claim(
  p_user uuid,
  p_mode text,
  p_cache_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_problem text;
  v_is_pro boolean := false;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_id uuid;
begin
  if v_uid is null or p_user is null or p_user <> v_uid then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_mode not in ('internal', 'live_web') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;
  if p_cache_key is null or char_length(p_cache_key) not between 20 and 160 then
    raise exception 'invalid_cache_key' using errcode = '22023';
  end if;
  if not public.mvp_open() then
    raise exception 'not_launched' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'profile_not_found' using errcode = 'P0001'; end if;
  if v_profile.is_ai_participant then raise exception 'ai_account_not_allowed' using errcode = 'P0001'; end if;
  v_problem := public.member_can_transact(v_profile);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;

  v_is_pro := coalesce(public.has_entitlement(v_uid, 'pro'), false) or v_profile.account_type = 'pro';
  v_daily_limit := coalesce((
    select value::integer from public.app_settings
    where key = case when v_is_pro then 'punt_ai_pro_daily_cap' else 'punt_ai_free_daily_cap' end
  ), case when v_is_pro then 40 else 20 end);
  v_monthly_limit := coalesce((
    select value::integer from public.app_settings
    where key = case when v_is_pro then 'punt_ai_pro_monthly_cap' else 'punt_ai_free_monthly_cap' end
  ), case when v_is_pro then 600 else 300 end);

  -- Separate advisory-lock namespace avoids collisions with other feature-level locks.
  perform pg_advisory_xact_lock(7002001, hashtext(v_uid::text));

  -- Recover abandoned in-flight claims so a crashed request cannot consume quota indefinitely.
  update public.punt_ai_usage
  set status = 'failed'
  where user_id = v_uid
    and status = 'started'
    and created_at < now() - interval '15 minutes';

  select count(*) filter (
           where created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg')
             at time zone 'Africa/Johannesburg'
             and status in ('started', 'completed')
         )::integer,
         count(*) filter (
           where created_at >= date_trunc('month', now() at time zone 'Africa/Johannesburg')
             at time zone 'Africa/Johannesburg'
             and status in ('started', 'completed')
         )::integer
    into v_daily_count, v_monthly_count
  from public.punt_ai_usage
  where user_id = v_uid;

  if v_daily_count >= v_daily_limit or v_monthly_count >= v_monthly_limit then
    return null;
  end if;

  insert into public.punt_ai_usage (user_id, mode, cache_key, status)
  values (v_uid, p_mode, p_cache_key, 'started')
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.punt_ai_claim(uuid, text, text) from public, anon;
grant execute on function public.punt_ai_claim(uuid, text, text) to authenticated;

insert into public.credit_prices (feature, title, credits, active)
values ('punt_ai_live', 'PUNT AI live-web answer', 2, true)
on conflict (feature) do update
set title = excluded.title, credits = excluded.credits, active = true;
