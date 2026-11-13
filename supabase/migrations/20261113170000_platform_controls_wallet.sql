-- Platform controls before launch (owner, 13 Nov 2026):
--   1. Launch gate: MVP features open to everyone on 1 Dec 2026 00:00 SAST; until then only admins (and members an
--      admin gives the `early_access` entitlement) can use them. Practice Mode is not gated.
--   2. Admin action log (append-only).
--   3. Account controls: account type, entitlements, suspension, access limits, warnings, private notifications.
--   4. API quotas: hard daily and monthly caps per provider, claimed before every call (fail closed).
--   5. Email outbox: queued emails sent in batches inside Resend's free quota (100 a day, 3,000 a month).
--   6. Wallet: PuntPoints transfers between members (with limits) and PAYG credits (no transfers).
--   7. Practice Mode demo wallet: demo PAYG credits, separate from everything real.
--   8. Admin analytics.
--
-- Additive: new tables, new columns with defaults, new functions, and one widened check constraint
-- (puntpoints_ledger.kind gains 'transfer_in' and 'transfer_out'). Nothing existing is removed or rewritten.

-- 1. Settings and launch gate ------------------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.app_settings (key, value) values ('launch_at', '2026-11-30T22:00:00Z')
on conflict (key) do nothing;

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entitlement text not null check (entitlement in ('early_access', 'pro', 'tools', 'beta_tester')),
  granted_by uuid references public.profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 280),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_entitlements_user_idx on public.user_entitlements (user_id, entitlement);

create or replace function public.has_entitlement(p_user uuid, p_entitlement text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_entitlements e
    where e.user_id = p_user and e.entitlement = p_entitlement and e.revoked_at is null
      and e.starts_at <= now() and (e.expires_at is null or e.expires_at > now())
  );
$$;

create or replace function public.launch_at()
returns timestamptz language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select value::timestamptz from public.app_settings where key = 'launch_at'),
                  '2026-11-30T22:00:00Z'::timestamptz);
$$;

-- True when the caller may use MVP features now.
create or replace function public.mvp_open()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select now() >= public.launch_at()
      or public.is_admin()
      or (auth.uid() is not null and public.has_entitlement(auth.uid(), 'early_access'));
$$;

create or replace function public.mvp_status()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('open', public.mvp_open(), 'launch_at', public.launch_at(),
                            'launched', now() >= public.launch_at());
$$;

-- Picks are an MVP feature: the server refuses them before launch for everyone but admins and testers.
-- create_prediction is wrapped by a BEFORE INSERT trigger rather than rewritten, so the hash-chain code is untouched.
create or replace function public.predictions_launch_gate()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.mvp_open() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not_launched' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create or replace trigger predictions_launch_gate before insert on public.predictions
  for each row execute function public.predictions_launch_gate();

-- 2. Admin action log --------------------------------------------------------------------------------------------

create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  target_user uuid references public.profiles (id) on delete set null,
  target text check (target is null or char_length(target) <= 200),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
create index if not exists admin_actions_target_idx on public.admin_actions (target_user, created_at desc);
create or replace trigger admin_actions_append_only before update or delete on public.admin_actions
  for each row execute function public.forbid_mutation();
create or replace trigger admin_actions_no_truncate before truncate on public.admin_actions
  for each statement execute function public.forbid_mutation();

-- For admin actions taken in SQL functions (the caller is the admin).
create or replace function public.log_admin_action(p_action text, p_target_user uuid, p_target text, p_detail jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  insert into public.admin_actions (admin_id, action, target_user, target, detail)
  values (auth.uid(), p_action, p_target_user, p_target, coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Changes to scoring rules and app settings are logged automatically.
create or replace function public.log_settings_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null then
    insert into public.admin_actions (admin_id, action, target, detail)
    values (auth.uid(), tg_argv[0], coalesce(to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'market'),
            jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  end if;
  return new;
end;
$$;
create or replace trigger app_settings_log after update on public.app_settings
  for each row execute function public.log_settings_change('settings.update');
create or replace trigger scoring_rules_log after update on public.scoring_rules
  for each row execute function public.log_settings_change('scoring.update');

-- 3. Account controls --------------------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists account_type text not null default 'free' check (account_type in ('free', 'payg', 'pro')),
  add column if not exists suspended_until timestamptz,
  add column if not exists suspension_reason text check (suspension_reason is null or char_length(suspension_reason) <= 280);

-- Members can never change their own account type or suspension (profiles_guard covers the older columns).
create or replace function public.profiles_guard_controls()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.account_type := 'free';
      new.suspended_until := null;
      new.suspension_reason := null;
    elsif new.account_type is distinct from old.account_type
       or new.suspended_until is distinct from old.suspended_until
       or new.suspension_reason is distinct from old.suspension_reason then
      raise exception 'protected_field' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create or replace trigger profiles_guard_controls before insert or update on public.profiles
  for each row execute function public.profiles_guard_controls();

create table if not exists public.account_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 280),
  message text not null check (char_length(message) between 3 and 1000),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists account_warnings_user_idx on public.account_warnings (user_id, created_at desc);

-- Private notifications: a notification with a recipient is seen only by that member.
alter table public.notifications add column if not exists recipient_id uuid references public.profiles (id) on delete cascade;
create index if not exists notifications_recipient_idx on public.notifications (recipient_id) where recipient_id is not null;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (published_at <= now() and (recipient_id is null or recipient_id = auth.uid() or public.is_admin()));

-- The caller's own account state, for banners and gates in the app.
create or replace function public.my_account_state()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'account_type', p.account_type,
    'banned', p.is_banned,
    'suspended_until', case when p.suspended_until > now() then p.suspended_until end,
    'limited_until', case when p.posting_paused_until > now() then p.posting_paused_until end,
    'entitlements', coalesce((select jsonb_agg(distinct e.entitlement) from public.user_entitlements e
                               where e.user_id = p.id and e.revoked_at is null and e.starts_at <= now()
                                 and (e.expires_at is null or e.expires_at > now())), '[]'::jsonb),
    'open_warnings', (select count(*) from public.account_warnings w where w.user_id = p.id and w.acknowledged_at is null),
    'mvp_open', public.mvp_open())
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.acknowledge_warnings()
returns integer language sql security definer set search_path = public, pg_temp as $$
  with done as (
    update public.account_warnings set acknowledged_at = now()
    where user_id = auth.uid() and acknowledged_at is null returning 1)
  select count(*)::integer from done;
$$;

-- 4. API quotas --------------------------------------------------------------------------------------------------
-- Every external call claims one unit first. A claim over the daily or monthly cap fails and the call is not made.
-- Usage lives in content_api_usage (one row per provider per UTC day).

create table if not exists public.api_quota_limits (
  provider text primary key,
  daily_cap integer not null check (daily_cap >= 0),
  monthly_cap integer not null check (monthly_cap >= 0),
  note text,
  updated_at timestamptz not null default now()
);
-- Kept below the lowest free allowance reported for each service on 13 Nov 2026. Admins can lower or raise them.
insert into public.api_quota_limits (provider, daily_cap, monthly_cap, note) values
  ('gemini:gemini-3.8-flash', 18, 540, 'free tier; lowest reported allowance 20 a day'),
  ('gemini:gemini-3.1-flash-lite', 450, 13500, 'free tier; lowest reported allowance 500 a day'),
  ('parallel', 60, 1500, 'paid from the prepaid balance; about $7.50 a month at most'),
  ('parallel-extract', 60, 1500, 'paid from the prepaid balance; about $1.50 a month at most'),
  ('firecrawl', 30, 450, 'free plan; reported as 500 one-off or 1,000 a month'),
  ('resend', 80, 2500, 'free plan: 100 a day, 3,000 a month; room left for sign-in emails')
on conflict (provider) do nothing;

alter table public.content_api_usage add column if not exists refused integer not null default 0;

create or replace function public.api_quota_claim(p_provider text, p_units integer default 1)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_limit public.api_quota_limits;
  v_day integer;
  v_month integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode = '22023';
  end if;
  select * into v_limit from public.api_quota_limits where provider = p_provider;
  if not found then
    return false; -- an unknown provider has no allowance: fail closed
  end if;
  perform pg_advisory_xact_lock(hashtext('api_quota:' || p_provider));
  select coalesce(sum(calls) filter (where day = v_today), 0), coalesce(sum(calls), 0)
    into v_day, v_month
  from public.content_api_usage
  where provider = p_provider and day >= date_trunc('month', v_today)::date;
  if v_day + p_units > v_limit.daily_cap or v_month + p_units > v_limit.monthly_cap then
    insert into public.content_api_usage (provider, day, calls, errors, refused) values (p_provider, v_today, 0, 0, 1)
    on conflict (provider, day) do update set refused = public.content_api_usage.refused + 1;
    return false;
  end if;
  insert into public.content_api_usage (provider, day, calls, errors) values (p_provider, v_today, p_units, 0)
  on conflict (provider, day) do update set calls = public.content_api_usage.calls + p_units;
  return true;
end;
$$;

create or replace function public.api_quota_error(p_provider text)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.content_api_usage (provider, day, calls, errors) values (p_provider, (now() at time zone 'utc')::date, 0, 1)
  on conflict (provider, day) do update set errors = public.content_api_usage.errors + 1;
$$;

create or replace function public.api_quota_status()
returns table (provider text, daily_cap integer, monthly_cap integer, today integer, month integer, errors_today integer,
               refused_today integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select l.provider, l.daily_cap, l.monthly_cap,
         coalesce(sum(u.calls) filter (where u.day = (now() at time zone 'utc')::date), 0)::integer,
         coalesce(sum(u.calls), 0)::integer,
         coalesce(sum(u.errors) filter (where u.day = (now() at time zone 'utc')::date), 0)::integer,
         coalesce(sum(u.refused) filter (where u.day = (now() at time zone 'utc')::date), 0)::integer
  from public.api_quota_limits l
  left join public.content_api_usage u
    on u.provider = l.provider and u.day >= date_trunc('month', now() at time zone 'utc')::date
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  group by l.provider, l.daily_cap, l.monthly_cap
  order by l.provider;
$$;

-- 5. Email outbox ------------------------------------------------------------------------------------------------

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  to_email text check (to_email is null or to_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  kind text not null check (kind in ('admin_message', 'account_notice', 'marketing', 'service')),
  subject text not null check (char_length(subject) between 3 and 140),
  body text not null check (char_length(body) between 3 and 5000),
  priority smallint not null default 5 check (priority between 1 and 9),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled', 'skipped')),
  not_before timestamptz not null default now(),
  attempts integer not null default 0,
  claimed_at timestamptz,
  last_error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_outbox_has_recipient check (user_id is not null or to_email is not null)
);
create index if not exists email_outbox_due_idx on public.email_outbox (priority, not_before) where status = 'queued';

-- Claims the next batch to send (marks them `sending`). Used only by the outbox cron.
create or replace function public.email_outbox_claim(p_limit integer)
returns setof public.email_outbox language sql security definer set search_path = public, pg_temp as $$
  update public.email_outbox o set status = 'sending', attempts = o.attempts + 1, claimed_at = now()
  where o.id in (
    select id from public.email_outbox
    where (status = 'queued' and not_before <= now() and attempts < 3)
       or (status = 'sending' and attempts < 3 and coalesce(claimed_at, created_at) <= now() - interval '30 minutes')
    order by priority, not_before
    limit least(greatest(coalesce(p_limit, 0), 0), 50)
    for update skip locked)
  returning o.*;
$$;

-- Puts claimed rows back without counting the claim as an attempt (used when the daily email cap stops a batch).
create or replace function public.email_outbox_release(p_ids uuid[])
returns integer language sql security definer set search_path = public, pg_temp as $$
  with r as (
    update public.email_outbox set status = 'queued', attempts = greatest(attempts - 1, 0), claimed_at = null
    where id = any(p_ids) and status = 'sending'
    returning 1)
  select count(*)::integer from r;
$$;

-- 6. Wallet ------------------------------------------------------------------------------------------------------

alter table public.puntpoints_ledger drop constraint if exists puntpoints_ledger_kind_check;
alter table public.puntpoints_ledger add constraint puntpoints_ledger_kind_check
  check (kind in ('award', 'spend', 'refund', 'adjust', 'reversal', 'transfer_in', 'transfer_out'));

create table if not exists public.puntpoints_transfers (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete restrict,
  to_user uuid not null references public.profiles (id) on delete restrict,
  points integer not null check (points between 10 and 200),
  note text check (note is null or char_length(note) <= 140),
  created_at timestamptz not null default now(),
  constraint puntpoints_transfers_not_self check (from_user <> to_user)
);
create index if not exists puntpoints_transfers_from_idx on public.puntpoints_transfers (from_user, created_at desc);
create index if not exists puntpoints_transfers_to_idx on public.puntpoints_transfers (to_user, created_at desc);
create or replace trigger puntpoints_transfers_append_only before update or delete on public.puntpoints_transfers
  for each row execute function public.forbid_mutation();

-- Transfer limits (owner-approved defaults, 13 Nov 2026). Kept in settings so an admin can change them.
insert into public.app_settings (key, value) values
  ('transfer_enabled', 'true'),
  ('transfer_min_points', '10'),
  ('transfer_max_points', '200'),
  ('transfer_daily_cap', '200'),
  ('transfer_monthly_cap', '1000'),
  ('transfer_min_account_days', '14'),
  ('transfer_hold_days', '7')
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select nullif(value, '')::integer from public.app_settings where key = p_key), p_default);
$$;

create or replace function public.puntpoints_balance(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(points), 0)::integer from public.puntpoints_ledger where user_id = p_user;
$$;

-- Points that may be sent: balance minus points awarded in the hold window, minus every referral award ever
-- (referral and partner points never move between members). Never below zero.
create or replace function public.puntpoints_transferable(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select greatest(0,
    public.puntpoints_balance(p_user)
    - coalesce((select sum(points) from public.puntpoints_ledger
                where user_id = p_user and kind in ('award', 'transfer_in')
                  and created_at > now() - make_interval(days => public.setting_int('transfer_hold_days', 7))), 0)
    - coalesce((select sum(points) from public.puntpoints_ledger
                where user_id = p_user and kind = 'award' and rule_code like 'referral%'), 0))::integer;
$$;

create or replace function public.member_can_transact(p public.profiles)
returns text language sql stable set search_path = public, pg_temp as $$
  select case
    when p.is_banned then 'banned'
    when p.suspended_until > now() then 'suspended'
    when p.posting_paused_until > now() then 'limited'
    when not p.is_18_attested then 'age_not_attested'
    else null end;
$$;

create or replace function public.transfer_puntpoints(p_to_username text, p_points integer, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_from public.profiles;
  v_to public.profiles;
  v_problem text;
  v_today integer;
  v_month integer;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if coalesce((select lower(value) from public.app_settings where key = 'transfer_enabled'), 'false') <> 'true' then
    raise exception 'transfers_paused' using errcode = 'P0001';
  end if;
  if p_points is null or p_points < public.setting_int('transfer_min_points', 10)
     or p_points > public.setting_int('transfer_max_points', 200) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 140 then raise exception 'note_too_long' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));
  select * into v_from from public.profiles where id = v_uid;
  v_problem := public.member_can_transact(v_from);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;
  if v_from.created_at > now() - make_interval(days => public.setting_int('transfer_min_account_days', 14)) then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;

  select * into v_to from public.profiles where username = lower(btrim(p_to_username));
  if not found or v_to.username::text like 'deleted-%' then raise exception 'recipient_not_found' using errcode = 'P0001'; end if;
  if v_to.id = v_uid then raise exception 'self_transfer' using errcode = 'P0001'; end if;
  v_problem := public.member_can_transact(v_to);
  if v_problem is not null then raise exception 'recipient_unavailable' using errcode = 'P0001'; end if;

  select coalesce(sum(points) filter (where created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'), 0),
         coalesce(sum(points) filter (where created_at >= date_trunc('month', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'), 0)
    into v_today, v_month
  from public.puntpoints_transfers where from_user = v_uid;
  if v_today + p_points > public.setting_int('transfer_daily_cap', 200) then raise exception 'daily_cap' using errcode = 'P0001'; end if;
  if v_month + p_points > public.setting_int('transfer_monthly_cap', 1000) then raise exception 'monthly_cap' using errcode = 'P0001'; end if;
  if public.puntpoints_transferable(v_uid) < p_points then raise exception 'insufficient_transferable' using errcode = 'P0001'; end if;

  insert into public.puntpoints_transfers (from_user, to_user, points, note)
  values (v_uid, v_to.id, p_points, nullif(btrim(p_note), '')) returning id into v_id;
  insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason) values
    (v_uid, 'transfer_out', -p_points, v_id::text, 'Sent to @' || v_to.username),
    (v_to.id, 'transfer_in', p_points, v_id::text, 'Received from @' || v_from.username);
  return jsonb_build_object('id', v_id, 'points', p_points, 'to', v_to.username::text,
                            'balance', public.puntpoints_balance(v_uid));
end;
$$;

-- PAYG credits: bought (once payments are on), granted by an admin, spent on premium features. Never transferable.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('purchase', 'grant', 'spend', 'refund', 'adjust', 'expire')),
  credits integer not null check (credits <> 0),
  feature text check (feature is null or feature ~ '^[a-z][a-z0-9_]{1,47}$'),
  ref_id text check (ref_id is null or char_length(ref_id) <= 120),
  reason text check (reason is null or char_length(reason) <= 280),
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists credit_ledger_spend_once on public.credit_ledger (user_id, ref_id) where kind = 'spend';
create unique index if not exists credit_ledger_purchase_once on public.credit_ledger (ref_id) where kind = 'purchase';
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
create or replace trigger credit_ledger_append_only before update or delete on public.credit_ledger
  for each row execute function public.forbid_mutation();
create or replace trigger credit_ledger_no_truncate before truncate on public.credit_ledger
  for each statement execute function public.forbid_mutation();

create table if not exists public.credit_prices (
  feature text primary key check (feature ~ '^[a-z][a-z0-9_]{1,47}$'),
  title text not null,
  credits integer not null check (credits between 1 and 100),
  active boolean not null default true
);
insert into public.credit_prices (feature, title, credits, active) values
  ('match_insight', 'Match intelligence report', 2, true),
  ('tipster_deep_stats', 'Tipster deep statistics', 1, true),
  ('ai_preview', 'AI match preview', 3, false)
on conflict (feature) do nothing;

create or replace function public.credit_balance(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(credits), 0)::integer from public.credit_ledger where user_id = p_user;
$$;

-- Spends credits for one use of a feature. `p_ref` makes it idempotent (a retry never charges twice).
-- Pro members and admins use features without spending.
create or replace function public.spend_credits(p_feature text, p_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_price public.credit_prices;
  v_problem text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if p_ref is null or char_length(p_ref) not between 3 and 120 then raise exception 'bad_ref' using errcode = 'P0001'; end if;
  select * into v_price from public.credit_prices where feature = p_feature and active;
  if not found then raise exception 'unknown_feature' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  v_problem := public.member_can_transact(v_profile);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;
  if v_profile.account_type = 'pro' or public.is_admin() or public.has_entitlement(v_uid, 'pro') then
    return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'included');
  end if;
  perform pg_advisory_xact_lock(hashtext('credits:' || v_uid::text));
  if exists (select 1 from public.credit_ledger where user_id = v_uid and kind = 'spend' and ref_id = p_ref) then
    return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'already_paid');
  end if;
  if public.credit_balance(v_uid) < v_price.credits then raise exception 'insufficient_credits' using errcode = 'P0001'; end if;
  insert into public.credit_ledger (user_id, kind, credits, feature, ref_id, reason)
  values (v_uid, 'spend', -v_price.credits, p_feature, p_ref, v_price.title);
  return jsonb_build_object('charged', v_price.credits, 'balance', public.credit_balance(v_uid), 'reason', 'charged');
end;
$$;

create or replace function public.admin_grant_credits(p_user uuid, p_credits integer, p_reason text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_credits is null or p_credits = 0 or abs(p_credits) > 1000 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  if p_credits < 0 and public.credit_balance(p_user) + p_credits < 0 then raise exception 'would_go_negative' using errcode = 'P0001'; end if;
  insert into public.credit_ledger (user_id, kind, credits, reason, admin_id)
  values (p_user, case when p_credits > 0 then 'grant' else 'adjust' end, p_credits, btrim(p_reason), auth.uid());
  perform public.log_admin_action('wallet.credits', p_user, null, jsonb_build_object('credits', p_credits, 'reason', p_reason));
  return public.credit_balance(p_user);
end;
$$;

create or replace function public.my_wallet()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'mvp_open', public.mvp_open(),
    'points', public.puntpoints_balance(auth.uid()),
    'points_transferable', public.puntpoints_transferable(auth.uid()),
    'credits', public.credit_balance(auth.uid()),
    'account_type', (select account_type from public.profiles where id = auth.uid()),
    'limits', jsonb_build_object(
      'min', public.setting_int('transfer_min_points', 10), 'max', public.setting_int('transfer_max_points', 200),
      'daily', public.setting_int('transfer_daily_cap', 200), 'monthly', public.setting_int('transfer_monthly_cap', 1000),
      'min_account_days', public.setting_int('transfer_min_account_days', 14),
      'hold_days', public.setting_int('transfer_hold_days', 7),
      'sent_today', coalesce((select sum(points) from public.puntpoints_transfers where from_user = auth.uid()
        and created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'), 0),
      'sent_month', coalesce((select sum(points) from public.puntpoints_transfers where from_user = auth.uid()
        and created_at >= date_trunc('month', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'), 0)),
    'prices', coalesce((select jsonb_agg(jsonb_build_object('feature', feature, 'title', title, 'credits', credits) order by credits)
                        from public.credit_prices where active), '[]'::jsonb))
  where auth.uid() is not null;
$$;

-- Unified history: both ledgers, newest first.
create or replace function public.my_wallet_history(p_limit integer default 50, p_before timestamptz default null)
returns table (at timestamptz, currency text, kind text, amount integer, description text)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from (
    select l.created_at, 'points'::text, l.kind, l.points,
           coalesce(l.reason, r.title, l.rule_code, l.kind)
    from public.puntpoints_ledger l left join public.point_rules r on r.code = l.rule_code
    where l.user_id = auth.uid()
    union all
    select c.created_at, 'credits'::text, c.kind, c.credits, coalesce(c.reason, c.feature, c.kind)
    from public.credit_ledger c where c.user_id = auth.uid()
  ) h (at, currency, kind, amount, description)
  where p_before is null or h.at < p_before
  order by h.at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- 7. Practice Mode demo wallet: demo PAYG credits. Never connected to real credits or PuntPoints. ----------------

create table if not exists public.practice_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('starter', 'spend', 'topup')),
  credits integer not null check (credits <> 0),
  feature text,
  ref_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists practice_credit_starter_once on public.practice_credit_ledger (user_id) where kind = 'starter';
create unique index if not exists practice_credit_spend_once on public.practice_credit_ledger (user_id, ref_id) where kind = 'spend';
create index if not exists practice_credit_user_idx on public.practice_credit_ledger (user_id, created_at desc);

-- Returns the demo wallet, creating the 30 starter demo credits on first use and a free top-up of 10 once a day
-- when the balance is below 5, so practice never dead-ends.
create or replace function public.practice_demo_wallet()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_balance integer;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.practice_credit_ledger (user_id, kind, credits) values (v_uid, 'starter', 30)
  on conflict do nothing;
  select coalesce(sum(credits), 0) into v_balance from public.practice_credit_ledger where user_id = v_uid;
  if v_balance < 5 and not exists (select 1 from public.practice_credit_ledger where user_id = v_uid and kind = 'topup'
                                    and created_at > now() - interval '1 day') then
    insert into public.practice_credit_ledger (user_id, kind, credits) values (v_uid, 'topup', 10);
    v_balance := v_balance + 10;
  end if;
  return jsonb_build_object(
    'credits', v_balance,
    'points', coalesce((select sum(points) from public.practice_points_ledger where user_id = v_uid), 0),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'kind', kind, 'credits', credits, 'feature', feature)
                                          order by created_at desc)
                         from (select * from public.practice_credit_ledger where user_id = v_uid order by created_at desc limit 20) h), '[]'::jsonb));
end;
$$;

create or replace function public.practice_spend_credits(p_feature text, p_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_price integer := case p_feature when 'match_insight' then 2 when 'model_preview' then 1 when 'tipster_deep_stats' then 1 end;
  v_balance integer;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_price is null then raise exception 'unknown_feature' using errcode = 'P0001'; end if;
  if p_ref is null or char_length(p_ref) not between 3 and 120 then raise exception 'bad_ref' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('practice_credits:' || v_uid::text));
  if exists (select 1 from public.practice_credit_ledger where user_id = v_uid and kind = 'spend' and ref_id = p_ref) then
    return jsonb_build_object('charged', 0, 'reason', 'already_unlocked');
  end if;
  select coalesce(sum(credits), 0) into v_balance from public.practice_credit_ledger where user_id = v_uid;
  if v_balance < v_price then raise exception 'insufficient_credits' using errcode = 'P0001'; end if;
  insert into public.practice_credit_ledger (user_id, kind, credits, feature, ref_id) values (v_uid, 'spend', -v_price, p_feature, p_ref);
  return jsonb_build_object('charged', v_price, 'balance', v_balance - v_price, 'reason', 'charged');
end;
$$;

-- 8. Admin analytics ---------------------------------------------------------------------------------------------

create or replace function public.admin_analytics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 180));
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'since', v_since,
    'totals', jsonb_build_object(
      'members', (select count(*) from public.profiles where role = 'user' and username::text not like 'deleted-%'),
      'new_members', (select count(*) from public.profiles where role = 'user' and created_at >= v_since),
      'founding_members', (select count(*) from public.profiles where founding_number is not null),
      'early_access_reserved', (select count(*) from public.early_access),
      'picks', (select count(*) from public.predictions where created_at >= v_since),
      'practice_picks', (select count(*) from public.practice_predictions where created_at >= v_since),
      'practice_players', (select count(distinct user_id) from public.practice_predictions where created_at >= v_since),
      'survey_responses', (select count(*) from public.survey_responses where created_at >= v_since),
      'transfers', (select count(*) from public.puntpoints_transfers where created_at >= v_since),
      'credits_spent', (select coalesce(-sum(credits), 0) from public.credit_ledger where kind = 'spend' and created_at >= v_since),
      'unique_visitors', (select count(distinct visitor) from public.campaign_events where created_at >= v_since)),
    'events', coalesce((select jsonb_agg(jsonb_build_object('event', event, 'count', n) order by n desc)
                        from (select event, count(*) n from public.campaign_events where created_at >= v_since
                              group by event order by n desc limit 30) e), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visitors', v, 'events', n, 'signups', s) order by d)
                       from (select g.d::date d,
                               (select count(distinct visitor) from public.campaign_events c where c.created_at >= g.d and c.created_at < g.d + interval '1 day') v,
                               (select count(*) from public.campaign_events c where c.created_at >= g.d and c.created_at < g.d + interval '1 day') n,
                               (select count(*) from public.profiles p where p.created_at >= g.d and p.created_at < g.d + interval '1 day') s
                             from generate_series(date_trunc('day', v_since), date_trunc('day', now()), interval '1 day') g(d)) x), '[]'::jsonb),
    'paths', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'count', n) order by n desc)
                       from (select path, count(*) n from public.campaign_events where created_at >= v_since and path is not null
                             group by path order by n desc limit 15) p), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', s, 'count', n) order by n desc)
                         from (select coalesce(utm_source, '(direct)') s, count(distinct visitor) n from public.campaign_events
                               where created_at >= v_since group by 1 order by n desc limit 10) q), '[]'::jsonb));
end;
$$;

-- 9. Access ------------------------------------------------------------------------------------------------------

alter table public.app_settings enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.admin_actions enable row level security;
alter table public.account_warnings enable row level security;
alter table public.api_quota_limits enable row level security;
alter table public.email_outbox enable row level security;
alter table public.puntpoints_transfers enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_prices enable row level security;
alter table public.practice_credit_ledger enable row level security;

revoke all on public.app_settings, public.user_entitlements, public.admin_actions, public.account_warnings,
  public.api_quota_limits, public.email_outbox, public.puntpoints_transfers, public.credit_ledger,
  public.credit_prices, public.practice_credit_ledger from anon, authenticated;

-- Admin writes go through server functions using the service role; signed-in users only get admin-only reads.
grant select on public.app_settings, public.api_quota_limits to authenticated;
grant select, insert, update on public.user_entitlements, public.account_warnings to authenticated;
grant select on public.admin_actions, public.puntpoints_transfers, public.credit_ledger, public.practice_credit_ledger,
  public.email_outbox to authenticated;
grant select on public.credit_prices to anon, authenticated;
grant select, insert, update, delete on public.app_settings, public.user_entitlements, public.account_warnings,
  public.api_quota_limits, public.email_outbox, public.credit_prices, public.practice_credit_ledger to service_role;
grant select, insert on public.admin_actions, public.puntpoints_transfers, public.credit_ledger to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for select to authenticated using (public.is_admin());
drop policy if exists app_settings_admin_update on public.app_settings;
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists api_quota_admin on public.api_quota_limits;
create policy api_quota_admin on public.api_quota_limits for select to authenticated using (public.is_admin());
drop policy if exists api_quota_admin_update on public.api_quota_limits;
create policy api_quota_admin_update on public.api_quota_limits for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists entitlements_read on public.user_entitlements;
create policy entitlements_read on public.user_entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists entitlements_admin_write on public.user_entitlements;
create policy entitlements_admin_write on public.user_entitlements for insert to authenticated with check (public.is_admin());
drop policy if exists entitlements_admin_update on public.user_entitlements;
create policy entitlements_admin_update on public.user_entitlements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists warnings_read on public.account_warnings;
create policy warnings_read on public.account_warnings for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists warnings_admin_write on public.account_warnings;
create policy warnings_admin_write on public.account_warnings for insert to authenticated with check (public.is_admin());
drop policy if exists warnings_admin_update on public.account_warnings;
create policy warnings_admin_update on public.account_warnings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_actions_admin on public.admin_actions;
create policy admin_actions_admin on public.admin_actions for select to authenticated using (public.is_admin());
drop policy if exists email_outbox_admin on public.email_outbox;
create policy email_outbox_admin on public.email_outbox for select to authenticated using (public.is_admin());
drop policy if exists transfers_read on public.puntpoints_transfers;
create policy transfers_read on public.puntpoints_transfers for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid() or public.is_admin());
drop policy if exists credit_ledger_read on public.credit_ledger;
create policy credit_ledger_read on public.credit_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists credit_prices_read on public.credit_prices;
create policy credit_prices_read on public.credit_prices for select to anon, authenticated using (true);
drop policy if exists credit_prices_admin on public.credit_prices;
create policy credit_prices_admin on public.credit_prices for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists practice_credit_read on public.practice_credit_ledger;
create policy practice_credit_read on public.practice_credit_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Functions: members call only their own; service-only functions stay closed to clients.
revoke all on function public.has_entitlement(uuid, text) from public, anon;
revoke all on function public.launch_at() from public;
revoke all on function public.mvp_open() from public;
revoke all on function public.mvp_status() from public;
revoke all on function public.predictions_launch_gate() from public, anon, authenticated;
revoke all on function public.log_admin_action(text, uuid, text, jsonb) from public, anon;
revoke all on function public.log_settings_change() from public, anon, authenticated;
revoke all on function public.profiles_guard_controls() from public, anon, authenticated;
revoke all on function public.my_account_state() from public, anon;
revoke all on function public.acknowledge_warnings() from public, anon;
revoke all on function public.api_quota_claim(text, integer) from public, anon, authenticated;
revoke all on function public.api_quota_error(text) from public, anon, authenticated;
revoke all on function public.api_quota_status() from public, anon;
revoke all on function public.email_outbox_claim(integer) from public, anon, authenticated;
revoke all on function public.email_outbox_release(uuid[]) from public, anon, authenticated;
revoke all on function public.setting_int(text, integer) from public, anon, authenticated;
revoke all on function public.puntpoints_balance(uuid) from public, anon, authenticated;
revoke all on function public.puntpoints_transferable(uuid) from public, anon, authenticated;
revoke all on function public.member_can_transact(public.profiles) from public, anon, authenticated;
revoke all on function public.transfer_puntpoints(text, integer, text) from public, anon;
revoke all on function public.credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.spend_credits(text, text) from public, anon;
revoke all on function public.admin_grant_credits(uuid, integer, text) from public, anon;
revoke all on function public.my_wallet() from public, anon;
revoke all on function public.my_wallet_history(integer, timestamptz) from public, anon;
revoke all on function public.practice_demo_wallet() from public, anon;
revoke all on function public.practice_spend_credits(text, text) from public, anon;
revoke all on function public.admin_analytics(integer) from public, anon;

grant execute on function public.launch_at(), public.mvp_open(), public.mvp_status() to anon, authenticated, service_role;
grant execute on function public.has_entitlement(uuid, text) to authenticated, service_role;
grant execute on function public.log_admin_action(text, uuid, text, jsonb), public.my_account_state(),
  public.acknowledge_warnings(), public.api_quota_status(), public.transfer_puntpoints(text, integer, text),
  public.spend_credits(text, text), public.admin_grant_credits(uuid, integer, text), public.my_wallet(),
  public.my_wallet_history(integer, timestamptz), public.practice_demo_wallet(),
  public.practice_spend_credits(text, text), public.admin_analytics(integer) to authenticated, service_role;
grant execute on function public.api_quota_claim(text, integer), public.api_quota_error(text),
  public.email_outbox_claim(integer), public.email_outbox_release(uuid[]), public.setting_int(text, integer), public.puntpoints_balance(uuid),
  public.puntpoints_transferable(uuid), public.credit_balance(uuid) to service_role;

-- 10. Schedule: email outbox every 15 minutes between 07:00 and 19:59 SAST. -----------------------------------
select cron.unschedule('email-outbox') where exists (select 1 from cron.job where jobname = 'email-outbox');
select cron.schedule('email-outbox', '*/15 5-17 * * *', $$select public.invoke_cron('/api/cron/email-outbox')$$);

-- 11. Newsroom notifications: daily sports articles no longer notify every member (owner decision, 13 Nov 2026).
--     Puntr news (every other category) still creates one notification on publication.
create or replace function public.newsroom_after_publish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'PUBLISHED' and new.category <> 'sports'
     and (tg_op = 'INSERT' or old.status is distinct from 'PUBLISHED') then
    insert into public.notifications (title, message, category, target_url, newsroom_article_id, published_at)
    values (
      left(new.title, 140), left(new.excerpt, 400),
      case new.category when 'company' then 'Company Updates' when 'product' then 'Product Development'
        when 'pfie' then 'PFIE & Technology' when 'features' then 'Features & Improvements'
        when 'community' then 'Community' else 'Launch Announcements' end,
      '/newsroom/' || new.slug, new.id, new.published_at)
    on conflict (newsroom_article_id) do nothing;
  end if;
  return new;
end;
$$;

-- 12. Legal notice versions for this change (Privacy: wallet, account administration, research services;
--     Terms: PuntPoints transfers, credits, account measures).
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-13-r12', now(), '/privacy'), ('terms', '2026-11-13-r12', now(), '/terms')
on conflict (kind, version) do nothing;

-- 13. Account deletion: anonymise_account() renames the profile to 'deleted-...'. When that happens, warnings
--     (which may quote the member), queued emails and access grants go too, as the Privacy page says.
create or replace function public.profiles_on_anonymise()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.username::text like 'deleted-%' and old.username::text not like 'deleted-%' then
    delete from public.account_warnings where user_id = new.id;
    delete from public.email_outbox where user_id = new.id and status in ('queued', 'sending', 'failed');
    update public.user_entitlements set revoked_at = now() where user_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_on_anonymise() from public, anon, authenticated;
create or replace trigger profiles_on_anonymise after update of username on public.profiles
  for each row execute function public.profiles_on_anonymise();
