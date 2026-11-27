-- Replace the temporary usage guard with plan-aware limits and member eligibility checks.
-- The server function calls this RPC with the service role after authenticating the member.

alter table public.punt_ai_cache
  add column if not exists updated_at timestamptz not null default now();

alter table public.punt_ai_usage
  add column if not exists updated_at timestamptz not null default now();

alter table public.punt_ai_usage
  drop constraint if exists punt_ai_usage_user_id_fkey;
alter table public.punt_ai_usage
  add constraint punt_ai_usage_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

create index if not exists punt_ai_usage_created_idx
  on public.punt_ai_usage(created_at desc);

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
  v_profile public.profiles;
  v_problem text;
  v_is_pro boolean := false;
  v_daily_limit integer;
  v_monthly_limit integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user is null
     or p_mode is null
     or p_mode not in ('internal', 'live_web')
     or p_cache_key is null
     or char_length(p_cache_key) not between 20 and 160 then
    raise exception 'invalid_punt_ai_request' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = p_user;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;
  if coalesce(v_profile.is_ai_participant, false) then
    raise exception 'member_not_eligible:ai_account_not_allowed' using errcode = '42501';
  end if;
  v_problem := public.member_can_transact(v_profile);
  if v_problem is not null then
    raise exception 'member_not_eligible:%', v_problem using errcode = '42501';
  end if;

  v_is_pro := coalesce(public.has_entitlement(p_user, 'pro'), false)
    or v_profile.account_type = 'pro';
  v_daily_limit := coalesce((
    select value::integer from public.app_settings
    where key = case when v_is_pro then 'punt_ai_pro_daily_cap' else 'punt_ai_free_daily_cap' end
  ), case when v_is_pro then 40 else 20 end);
  v_monthly_limit := coalesce((
    select value::integer from public.app_settings
    where key = case when v_is_pro then 'punt_ai_pro_monthly_cap' else 'punt_ai_free_monthly_cap' end
  ), case when v_is_pro then 600 else 300 end);

  perform pg_advisory_xact_lock(7002001, hashtext(p_user::text));

  update public.punt_ai_usage
  set status = 'failed'
  where user_id = p_user
    and status = 'started'
    and created_at < now() - interval '15 minutes';

  v_day_start := date_trunc('day', now() at time zone 'Africa/Johannesburg')
    at time zone 'Africa/Johannesburg';
  v_month_start := date_trunc('month', now() at time zone 'Africa/Johannesburg')
    at time zone 'Africa/Johannesburg';

  select
    count(*) filter (
      where created_at >= v_day_start and status in ('started', 'completed')
    )::integer,
    count(*) filter (
      where created_at >= v_month_start and status in ('started', 'completed')
    )::integer
  into v_daily_count, v_monthly_count
  from public.punt_ai_usage
  where user_id = p_user;

  if v_daily_count >= v_daily_limit or v_monthly_count >= v_monthly_limit then
    return null;
  end if;

  insert into public.punt_ai_usage(user_id, mode, cache_key, status)
  values (p_user, p_mode, p_cache_key, 'started')
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.punt_ai_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.punt_ai_claim(uuid, text, text) to service_role;

alter table public.punt_ai_cache enable row level security;
alter table public.punt_ai_usage enable row level security;
revoke all on public.punt_ai_cache, public.punt_ai_usage from anon, authenticated;
grant all on public.punt_ai_cache, public.punt_ai_usage to service_role;
