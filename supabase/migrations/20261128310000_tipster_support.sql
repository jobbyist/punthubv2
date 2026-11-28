-- Tipster Support (28 Nov 2026).
--
-- A member unlocks Tipster Support by (1) passing identity verification and (2) a streak of 10 consecutive winning
-- picks on fixtures that kicked off in the last 30 days. Once unlocked, the tipster sets prices in PuntPoints
-- (per copied pick, weekly or monthly) and other members can "support" them: every new pick the tipster posts is
-- copied into the supporter's Copied picks list with an alert, plus an optional supporters-only note.
--
-- Design rules
-- * Merit, not money: unlocking and earning are open to every verified member. Puntr Pro adds capacity and a lower
--   fee (Pro supporters can back 10 tipsters instead of 2; Pro tipsters pay 0% platform fee instead of 10%).
-- * Picks stay public. The append-only hash chain, the leaderboard and every record are untouched. Copied picks are
--   NOT written to the supporter's own record, so copying can never inflate anyone's stats or streak.
-- * Escrow, never trust: every charge is held from the supporter (ledger 'tipster_hold') and released to the tipster
--   ('tipster_earning') only when it is earned. A per-pick charge is released when the pick settles won or lost and
--   refunded ('tipster_refund') when it is void or hidden by moderation. A weekly/monthly charge is released after
--   the period once at least one pick copied in it has settled won or lost ("no-pick guarantee"); it waits up to
--   14 days for pending picks and is otherwise refunded in full.
-- * Transfer safeguards as for duels: 14-day-old account, 18+, good standing, only transferable points, a rolling
--   30-day spend cap, and earnings sit in the 7-day hold window before they are transferable.
-- * Streak integrity: one pick per fixture counts (the first one posted), voids are skipped, a win below the minimum
--   settle odds (default 1.40) does not count but a loss at any price breaks the streak, hidden picks never count.
--
-- Points are a loyalty scheme, never cash. Supporting a tipster buys access to their alerts and notes, not an
-- outcome: the charge does not depend on whether the pick wins. [attorney review] Terms §6A describes the scheme.

-- 1. Settings (editable in Admin > System). ----------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('tipster_support_enabled', 'true'),
  ('tipster_streak_length', '10'),
  ('tipster_streak_window_days', '30'),
  ('tipster_streak_min_odds', '1.40'),
  ('tipster_fee_pct', '10'),
  ('tipster_fee_pct_pro', '0'),
  ('tipster_support_limit_free', '2'),
  ('tipster_support_limit_pro', '10'),
  ('tipster_price_pick_min', '5'),
  ('tipster_price_pick_max', '100'),
  ('tipster_price_week_min', '20'),
  ('tipster_price_week_max', '400'),
  ('tipster_price_month_min', '50'),
  ('tipster_price_month_max', '1200'),
  ('tipster_monthly_spend_cap', '1500')
on conflict (key) do nothing;

-- 2. Ledger kinds. ------------------------------------------------------------------------------------------------
alter table public.puntpoints_ledger drop constraint if exists puntpoints_ledger_kind_check;
alter table public.puntpoints_ledger add constraint puntpoints_ledger_kind_check check (kind = any (array[
  'award', 'spend', 'refund', 'adjust', 'reversal', 'transfer_in', 'transfer_out',
  'duel_stake', 'duel_payout', 'duel_refund',
  'tipster_hold', 'tipster_earning', 'tipster_refund']));

-- Earnings join awards and transfers in the hold window before they can be spent on transfers, stakes or support.
create or replace function public.puntpoints_transferable(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select greatest(0,
    public.puntpoints_balance(p_user)
    - coalesce((select sum(points) from public.puntpoints_ledger
                where user_id = p_user and kind in ('award', 'transfer_in', 'tipster_earning')
                  and created_at > now() - make_interval(days => public.setting_int('transfer_hold_days', 7))), 0)
    - coalesce((select sum(points) from public.puntpoints_ledger
                where user_id = p_user and kind = 'award' and rule_code like 'referral%'), 0))::integer;
$$;

-- 3. Tables. -----------------------------------------------------------------------------------------------------
create table if not exists public.tipster_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'qualified' check (status in ('qualified', 'active', 'paused', 'revoked')),
  qualified_at timestamptz not null default now(),
  unlocked_at timestamptz,
  streak_at_unlock integer,
  accepting boolean not null default false,
  price_pick integer check (price_pick is null or price_pick > 0),
  price_week integer check (price_week is null or price_week > 0),
  price_month integer check (price_month is null or price_month > 0),
  pitch text check (pitch is null or char_length(pitch) <= 280),
  status_reason text check (status_reason is null or char_length(status_reason) <= 300),
  updated_at timestamptz not null default now()
);

create table if not exists public.tipster_subscriptions (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references public.profiles (id) on delete cascade,
  tipster_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('pick', 'week', 'month')),
  price integer not null check (price > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'expired', 'ended')),
  auto_renew boolean not null default true,
  period_start timestamptz,
  period_end timestamptz,
  end_reason text,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint tipster_subscriptions_not_self check (supporter_id <> tipster_id),
  constraint tipster_subscriptions_period check (
    (plan = 'pick' and period_end is null) or (plan <> 'pick' and period_start is not null and period_end > period_start))
);
create unique index if not exists tipster_subscriptions_one_live
  on public.tipster_subscriptions (supporter_id, tipster_id) where status in ('active', 'paused');
create index if not exists tipster_subscriptions_tipster_idx on public.tipster_subscriptions (tipster_id, status);
create index if not exists tipster_subscriptions_due_idx
  on public.tipster_subscriptions (period_end) where status = 'active' and plan <> 'pick';

create table if not exists public.tipster_charges (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.tipster_subscriptions (id) on delete cascade,
  supporter_id uuid not null references public.profiles (id) on delete cascade,
  tipster_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('pick', 'period')),
  prediction_id uuid references public.predictions (id) on delete restrict,
  amount integer not null check (amount > 0),
  fee integer not null default 0 check (fee >= 0),
  status text not null default 'held' check (status in ('held', 'paid', 'refunded')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint tipster_charges_pick_has_prediction check ((kind = 'pick') = (prediction_id is not null)),
  constraint tipster_charges_period_bounds check ((kind = 'period') = (period_end is not null))
);
create unique index if not exists tipster_charges_one_per_pick
  on public.tipster_charges (subscription_id, prediction_id) where kind = 'pick';
create index if not exists tipster_charges_held_pick_idx on public.tipster_charges (prediction_id) where status = 'held';
create index if not exists tipster_charges_tipster_idx on public.tipster_charges (tipster_id, created_at desc);
create index if not exists tipster_charges_supporter_idx on public.tipster_charges (supporter_id, created_at desc);
create index if not exists tipster_charges_held_period_idx on public.tipster_charges (period_end)
  where status = 'held' and kind = 'period';

create table if not exists public.tipster_copies (
  supporter_id uuid not null references public.profiles (id) on delete cascade,
  prediction_id uuid not null references public.predictions (id) on delete restrict,
  tipster_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid not null references public.tipster_subscriptions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (supporter_id, prediction_id)
);
create index if not exists tipster_copies_sub_idx on public.tipster_copies (subscription_id, created_at);

create table if not exists public.tipster_pick_notes (
  prediction_id uuid primary key references public.predictions (id) on delete restrict,
  tipster_id uuid not null references public.profiles (id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.tipster_profiles enable row level security;
alter table public.tipster_subscriptions enable row level security;
alter table public.tipster_charges enable row level security;
alter table public.tipster_copies enable row level security;
alter table public.tipster_pick_notes enable row level security;

-- Members read their own rows; everything else (and every write) goes through the functions below.
drop policy if exists tipster_profiles_own on public.tipster_profiles;
create policy tipster_profiles_own on public.tipster_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists tipster_subscriptions_own on public.tipster_subscriptions;
create policy tipster_subscriptions_own on public.tipster_subscriptions for select to authenticated
  using (supporter_id = auth.uid() or tipster_id = auth.uid() or public.is_admin());
drop policy if exists tipster_charges_own on public.tipster_charges;
create policy tipster_charges_own on public.tipster_charges for select to authenticated
  using (supporter_id = auth.uid() or tipster_id = auth.uid() or public.is_admin());
drop policy if exists tipster_copies_own on public.tipster_copies;
create policy tipster_copies_own on public.tipster_copies for select to authenticated
  using (supporter_id = auth.uid() or public.is_admin());
drop policy if exists tipster_pick_notes_own on public.tipster_pick_notes;
create policy tipster_pick_notes_own on public.tipster_pick_notes for select to authenticated
  using (tipster_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.tipster_copies c
                    where c.prediction_id = tipster_pick_notes.prediction_id and c.supporter_id = auth.uid()));

revoke all on public.tipster_profiles, public.tipster_subscriptions, public.tipster_charges,
  public.tipster_copies, public.tipster_pick_notes from anon, authenticated;
grant select on public.tipster_profiles, public.tipster_subscriptions, public.tipster_charges,
  public.tipster_copies, public.tipster_pick_notes to authenticated;
grant select, insert, update, delete on public.tipster_profiles, public.tipster_subscriptions,
  public.tipster_charges, public.tipster_copies, public.tipster_pick_notes to service_role;

-- 4. Helpers. ----------------------------------------------------------------------------------------------------
create or replace function public.tipster_setting_numeric(p_key text, p_default numeric)
returns numeric language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select value::numeric from public.app_settings where key = p_key), p_default);
$$;

create or replace function public.tipster_notify(p_user uuid, p_title text, p_message text, p_url text)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (title, message, category, target_url, audience, recipient_id, published_at)
  values (left(p_title, 140), left(p_message, 400), 'tipster_support', p_url, 'all', p_user, now());
$$;

create or replace function public.tipster_is_verified(p_user uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.identity_verifications where user_id = p_user and status = 'approved');
$$;

-- The current qualifying streak: consecutive counted wins, newest first, on fixtures that kicked off inside the
-- window. Returns the streak, the target, the window and the last 10 counted results for the progress UI.
create or replace function public.tipster_streak(p_user uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with firsts as (
    select distinct on (p.fixture_id) p.id, p.fixture_id, p.created_at
    from public.predictions p
    where p.user_id = p_user
    order by p.fixture_id, p.created_at
  ), q as (
    select f.id, fx.kickoff_at, r.result, st.settle_odds,
           (r.result = 'won' and st.settle_odds >= public.tipster_setting_numeric('tipster_streak_min_odds', 1.40)) as counts
    from firsts f
    join public.fixtures fx on fx.id = f.fixture_id
    join public.prediction_results r on r.prediction_id = f.id
    join public.prediction_odds_state st on st.prediction_id = f.id
    where r.result in ('won', 'lost')
      and fx.kickoff_at > now() - make_interval(days => public.setting_int('tipster_streak_window_days', 30))
      and not exists (select 1 from public.hidden_predictions h where h.prediction_id = f.id)
  ), ordered as (
    select q.*, sum(case when result = 'lost' then 1 else 0 end)
             over (order by kickoff_at desc, id rows unbounded preceding) as losses_so_far,
           row_number() over (order by kickoff_at desc, id) as rn
    from q
  )
  select jsonb_build_object(
    'streak', coalesce((select count(*) from ordered where losses_so_far = 0 and counts), 0),
    'target', public.setting_int('tipster_streak_length', 10),
    'window_days', public.setting_int('tipster_streak_window_days', 30),
    'min_odds', public.tipster_setting_numeric('tipster_streak_min_odds', 1.40),
    'recent', coalesce((select jsonb_agg(case when result = 'lost' then 'L' when counts then 'W' else 'S' end
                                          order by rn desc)
                        from ordered where rn <= 10), '[]'::jsonb));
$$;

-- Records a qualifying streak and unlocks the tipster once they are verified and in good standing.
create or replace function public.tipster_check_unlock(p_user uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_tp public.tipster_profiles;
  v_profile public.profiles;
  v_streak integer;
begin
  if p_user is null then return null; end if;
  select * into v_tp from public.tipster_profiles where user_id = p_user;
  if found and v_tp.status in ('active', 'paused', 'revoked') then return v_tp.status; end if;
  select * into v_profile from public.profiles where id = p_user;
  if not found or v_profile.is_ai_participant then return null; end if;

  if v_tp.user_id is null then
    v_streak := (public.tipster_streak(p_user)->>'streak')::integer;
    if v_streak < public.setting_int('tipster_streak_length', 10) then return null; end if;
    insert into public.tipster_profiles (user_id, status, qualified_at, streak_at_unlock)
    values (p_user, 'qualified', now(), v_streak)
    on conflict (user_id) do nothing;
    select * into v_tp from public.tipster_profiles where user_id = p_user;
  end if;

  if v_tp.status = 'qualified' and public.tipster_is_verified(p_user) and public.member_can_transact(v_profile) is null then
    update public.tipster_profiles set status = 'active', unlocked_at = now(), updated_at = now() where user_id = p_user;
    perform public.tipster_notify(p_user, 'Tipster Support unlocked',
      'You hit the streak. Set your prices in Tipster Support so members can follow and copy your picks.',
      '/tipster-support?tab=tipster');
    return 'active';
  elsif v_tp.status = 'qualified' and v_tp.qualified_at > now() - interval '1 minute' then
    perform public.tipster_notify(p_user, 'Streak complete: verify to unlock Tipster Support',
      'You hit the streak. Verify your identity to unlock Tipster Support.', '/account#identity');
  end if;
  return v_tp.status;
end;
$$;

create or replace function public.tipster_fee_for(p_tipster uuid, p_amount integer)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select floor(p_amount * (case when public.has_entitlement(p_tipster, 'pro')
                                then public.setting_int('tipster_fee_pct_pro', 0)
                                else public.setting_int('tipster_fee_pct', 10) end) / 100.0)::integer;
$$;

-- Releases a held charge to the tipster (less the platform fee, which is burned) or refunds the supporter.
create or replace function public.tipster_resolve_charge(p_charge uuid, p_pay boolean, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_c public.tipster_charges;
  v_fee integer;
begin
  select * into v_c from public.tipster_charges where id = p_charge and status = 'held' for update;
  if not found then return; end if;
  if p_pay then
    v_fee := least(public.tipster_fee_for(v_c.tipster_id, v_c.amount), v_c.amount);
    if v_c.amount - v_fee > 0 then
      insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
      values (v_c.tipster_id, 'tipster_earning', v_c.amount - v_fee, v_c.id::text, left(p_reason, 200));
    end if;
    update public.tipster_charges set status = 'paid', fee = v_fee, resolved_at = now() where id = v_c.id;
  else
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_c.supporter_id, 'tipster_refund', v_c.amount, v_c.id::text, left(p_reason, 200));
    update public.tipster_charges set status = 'refunded', resolved_at = now() where id = v_c.id;
  end if;
end;
$$;

-- Points this member has put on hold for Tipster Support in the last 30 days (refunds excluded).
create or replace function public.tipster_spent_30d(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(amount), 0)::integer from public.tipster_charges
  where supporter_id = p_user and status <> 'refunded' and created_at > now() - interval '30 days';
$$;

-- Shared checks before any hold. Raises with a code the app translates.
create or replace function public.tipster_check_hold(p_user uuid, p_amount integer)
returns void language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_profile public.profiles;
  v_problem text;
begin
  select * into v_profile from public.profiles where id = p_user;
  v_problem := public.member_can_transact(v_profile);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;
  if v_profile.created_at > now() - make_interval(days => public.setting_int('transfer_min_account_days', 14)) then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  if public.tipster_spent_30d(p_user) + p_amount > public.setting_int('tipster_monthly_spend_cap', 1500) then
    raise exception 'spend_cap' using errcode = 'P0001';
  end if;
  if public.puntpoints_transferable(p_user) < p_amount then
    raise exception 'insufficient_transferable' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.tipster_plan_interval(p_plan text)
returns interval language sql immutable as $$
  select case p_plan when 'week' then interval '7 days' when 'month' then interval '30 days' end;
$$;

-- 5. Member actions. ---------------------------------------------------------------------------------------------
create or replace function public.update_tipster_settings(
  p_accepting boolean, p_price_pick integer, p_price_week integer, p_price_month integer, p_pitch text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_tp public.tipster_profiles;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_tp from public.tipster_profiles where user_id = v_uid for update;
  if not found or v_tp.status <> 'active' then raise exception 'not_unlocked' using errcode = 'P0001'; end if;
  if p_pitch is not null and char_length(p_pitch) > 280 then raise exception 'pitch_too_long' using errcode = 'P0001'; end if;
  if (p_price_pick is not null and (p_price_pick < public.setting_int('tipster_price_pick_min', 5)
        or p_price_pick > public.setting_int('tipster_price_pick_max', 100)))
     or (p_price_week is not null and (p_price_week < public.setting_int('tipster_price_week_min', 20)
        or p_price_week > public.setting_int('tipster_price_week_max', 400)))
     or (p_price_month is not null and (p_price_month < public.setting_int('tipster_price_month_min', 50)
        or p_price_month > public.setting_int('tipster_price_month_max', 1200))) then
    raise exception 'invalid_price' using errcode = 'P0001';
  end if;
  if coalesce(p_accepting, false) and p_price_pick is null and p_price_week is null and p_price_month is null then
    raise exception 'no_price' using errcode = 'P0001';
  end if;
  update public.tipster_profiles
     set accepting = coalesce(p_accepting, false), price_pick = p_price_pick, price_week = p_price_week,
         price_month = p_price_month, pitch = nullif(btrim(p_pitch), ''), updated_at = now()
   where user_id = v_uid
   returning * into v_tp;
  return to_jsonb(v_tp) - 'status_reason';
end;
$$;

create or replace function public.support_tipster(p_username text, p_plan text, p_auto_renew boolean default true)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_tipster public.profiles;
  v_tp public.tipster_profiles;
  v_price integer;
  v_limit integer;
  v_id uuid;
  v_charge uuid;
  v_me text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if not public.setting_bool('tipster_support_enabled', true) then raise exception 'support_paused' using errcode = 'P0001'; end if;
  if p_plan not in ('pick', 'week', 'month') then raise exception 'invalid_plan' using errcode = 'P0001'; end if;

  select * into v_tipster from public.profiles where username = lower(ltrim(btrim(coalesce(p_username, '')), '@'));
  if not found then raise exception 'tipster_not_found' using errcode = 'P0001'; end if;
  if v_tipster.id = v_uid then raise exception 'self_support' using errcode = 'P0001'; end if;
  select * into v_tp from public.tipster_profiles where user_id = v_tipster.id;
  if not found or v_tp.status <> 'active' or not v_tp.accepting or public.member_can_transact(v_tipster) is not null then
    raise exception 'tipster_unavailable' using errcode = 'P0001';
  end if;
  v_price := case p_plan when 'pick' then v_tp.price_pick when 'week' then v_tp.price_week else v_tp.price_month end;
  if v_price is null then raise exception 'invalid_plan' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));
  if exists (select 1 from public.tipster_subscriptions where supporter_id = v_uid and tipster_id = v_tipster.id
             and status in ('active', 'paused')) then
    raise exception 'already_supporting' using errcode = 'P0001';
  end if;
  v_limit := case when public.has_entitlement(v_uid, 'pro') then public.setting_int('tipster_support_limit_pro', 10)
                  else public.setting_int('tipster_support_limit_free', 2) end;
  if (select count(*) from public.tipster_subscriptions where supporter_id = v_uid and status in ('active', 'paused'))
     >= v_limit then
    raise exception 'support_limit' using errcode = 'P0001';
  end if;
  -- A per-pick plan must cover at least one pick up front; a period plan is held in full now.
  perform public.tipster_check_hold(v_uid, v_price);

  insert into public.tipster_subscriptions (supporter_id, tipster_id, plan, price, auto_renew, period_start, period_end)
  values (v_uid, v_tipster.id, p_plan, v_price, case when p_plan = 'pick' then true else coalesce(p_auto_renew, true) end,
          case when p_plan = 'pick' then null else now() end,
          case when p_plan = 'pick' then null else now() + public.tipster_plan_interval(p_plan) end)
  returning id into v_id;

  if p_plan <> 'pick' then
    insert into public.tipster_charges (subscription_id, supporter_id, tipster_id, kind, amount, period_start, period_end)
    select v_id, v_uid, v_tipster.id, 'period', v_price, s.period_start, s.period_end
      from public.tipster_subscriptions s where s.id = v_id
    returning id into v_charge;
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_uid, 'tipster_hold', -v_price, v_charge::text, 'Tipster Support held: @' || v_tipster.username);
  end if;

  select username into v_me from public.profiles where id = v_uid;
  perform public.tipster_notify(v_tipster.id, 'New supporter',
    '@' || v_me || ' is now supporting you. Their copies start with your next pick.', '/tipster-support?tab=tipster');
  return v_id;
end;
$$;

-- p_on = false: per-pick plans stop now; period plans stop renewing and run to the end of the paid period.
-- p_on = true: resumes a paused per-pick plan or switches renewal back on.
create or replace function public.set_tipster_support(p_subscription uuid, p_on boolean)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_s public.tipster_subscriptions;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_s from public.tipster_subscriptions where id = p_subscription and supporter_id = v_uid for update;
  if not found or v_s.status not in ('active', 'paused') then raise exception 'support_unavailable' using errcode = 'P0001'; end if;
  if v_s.plan = 'pick' then
    if p_on then
      if v_s.status = 'paused' then
        perform public.tipster_check_hold(v_uid, v_s.price);
        update public.tipster_subscriptions set status = 'active' where id = v_s.id;
      end if;
      return 'active';
    end if;
    update public.tipster_subscriptions set status = 'cancelled', ended_at = now(), end_reason = 'supporter'
     where id = v_s.id;
    return 'cancelled';
  end if;
  update public.tipster_subscriptions set auto_renew = coalesce(p_on, false) where id = v_s.id;
  return case when p_on then 'renewing' else 'ending' end;
end;
$$;

-- A short supporters-only note on one of the tipster's own picks, before kick-off. Written once, never edited.
create or replace function public.add_tipster_note(p_prediction uuid, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_kickoff timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.tipster_profiles where user_id = v_uid and status = 'active') then
    raise exception 'not_unlocked' using errcode = 'P0001';
  end if;
  if p_note is null or char_length(btrim(p_note)) not between 1 and 1000 then
    raise exception 'invalid_note' using errcode = 'P0001';
  end if;
  select fx.kickoff_at into v_kickoff from public.predictions p join public.fixtures fx on fx.id = p.fixture_id
   where p.id = p_prediction and p.user_id = v_uid;
  if not found then raise exception 'not_your_pick' using errcode = 'P0001'; end if;
  if v_kickoff <= now() then raise exception 'kickoff_passed' using errcode = 'P0001'; end if;
  insert into public.tipster_pick_notes (prediction_id, tipster_id, note) values (p_prediction, v_uid, btrim(p_note));
exception when unique_violation then
  raise exception 'note_exists' using errcode = 'P0001';
end;
$$;

-- 6. Triggers. ---------------------------------------------------------------------------------------------------
-- A tipster posts a pick: copy it to every live supporter. Per-pick plans hold the price now (or pause when the
-- supporter can no longer pay). Never blocks the pick itself.
create or replace function public.tipster_on_prediction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s public.tipster_subscriptions;
  v_charge uuid;
  v_tipster text;
  v_match text;
begin
  if not exists (select 1 from public.tipster_profiles where user_id = new.user_id and status = 'active') then
    return new;
  end if;
  begin
    select username into v_tipster from public.profiles where id = new.user_id;
    select home || ' vs ' || away into v_match from public.fixtures where id = new.fixture_id;
    for v_s in select * from public.tipster_subscriptions where tipster_id = new.user_id and status = 'active'
               order by created_at loop
      if v_s.plan = 'pick' then
        perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_s.supporter_id::text));
        begin
          perform public.tipster_check_hold(v_s.supporter_id, v_s.price);
        exception when others then
          update public.tipster_subscriptions set status = 'paused', end_reason = sqlerrm where id = v_s.id;
          perform public.tipster_notify(v_s.supporter_id, 'Tipster Support paused',
            'We could not copy a new pick from @' || v_tipster || ' (' || sqlerrm || '). Resume when you are ready.',
            '/tipster-support');
          continue;
        end;
        insert into public.tipster_charges (subscription_id, supporter_id, tipster_id, kind, prediction_id, amount)
        values (v_s.id, v_s.supporter_id, new.user_id, 'pick', new.id, v_s.price) returning id into v_charge;
        insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
        values (v_s.supporter_id, 'tipster_hold', -v_s.price, v_charge::text, 'Copied pick held: @' || v_tipster);
      elsif v_s.period_end <= now() then
        continue;
      end if;
      insert into public.tipster_copies (supporter_id, prediction_id, tipster_id, subscription_id)
      values (v_s.supporter_id, new.id, new.user_id, v_s.id) on conflict do nothing;
      perform public.tipster_notify(v_s.supporter_id, 'New pick from @' || v_tipster,
        coalesce(v_match, 'A new pick') || ' copied to your Tipster Support list.', '/tipster-support');
    end loop;
  exception when others then
    raise warning 'tipster copy failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists z_tipster_on_prediction on public.predictions;
create trigger z_tipster_on_prediction after insert on public.predictions
  for each row execute function public.tipster_on_prediction();

-- A pick settles: release or refund its held per-pick charges, then re-check the tipster's unlock streak.
create or replace function public.tipster_on_settlement()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_charge uuid;
  v_user uuid;
begin
  begin
    for v_charge in select id from public.tipster_charges where prediction_id = new.prediction_id and status = 'held' loop
      perform public.tipster_resolve_charge(v_charge, new.result in ('won', 'lost'),
        case when new.result in ('won', 'lost') then 'Copied pick settled' else 'Copied pick void: refunded' end);
    end loop;
    if new.result in ('won', 'lost') then
      select user_id into v_user from public.predictions where id = new.prediction_id;
      perform public.tipster_check_unlock(v_user);
    end if;
  exception when others then
    raise warning 'tipster settlement failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists z_tipster_on_settlement on public.settlement_events;
create trigger z_tipster_on_settlement after insert on public.settlement_events
  for each row execute function public.tipster_on_settlement();

-- Moderation hides a pick: supporters get their per-pick charge back.
create or replace function public.tipster_on_hidden()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_charge uuid;
begin
  begin
    for v_charge in select id from public.tipster_charges where prediction_id = new.prediction_id and status = 'held' loop
      perform public.tipster_resolve_charge(v_charge, false, 'Copied pick removed by moderation: refunded');
    end loop;
  exception when others then
    raise warning 'tipster hidden refund failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists z_tipster_on_hidden on public.hidden_predictions;
create trigger z_tipster_on_hidden after insert on public.hidden_predictions
  for each row execute function public.tipster_on_hidden();

-- Identity approved after the streak: unlock.
create or replace function public.tipster_on_verification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'approved' and exists (select 1 from public.tipster_profiles where user_id = new.user_id and status = 'qualified') then
    perform public.tipster_check_unlock(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists z_tipster_on_verification on public.identity_verifications;
create trigger z_tipster_on_verification after insert or update of status on public.identity_verifications
  for each row execute function public.tipster_on_verification();

-- 7. Periods (cron every 15 minutes). ----------------------------------------------------------------------------
create or replace function public.process_tipster_periods(p_limit integer default 200)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_c public.tipster_charges;
  v_s public.tipster_subscriptions;
  v_tp public.tipster_profiles;
  v_charge uuid;
  v_settled boolean;
  v_pending boolean;
  v_price integer;
  v_tipster text;
  v_n integer := 0;
begin
  -- (a) Resolve held period charges whose period has ended. Paid once a copied pick from the period has settled
  -- won or lost; left held while copied picks are still pending (up to 14 days after the period, e.g. a pick on a
  -- match after the period ends); otherwise refunded in full.
  for v_c in select * from public.tipster_charges
             where kind = 'period' and status = 'held' and period_end <= now()
             order by period_end limit greatest(coalesce(p_limit, 200), 1)
             for update skip locked loop
    select exists (
             select 1 from public.tipster_copies c
             join public.prediction_results r on r.prediction_id = c.prediction_id
             where c.subscription_id = v_c.subscription_id
               and c.created_at >= v_c.period_start and c.created_at < v_c.period_end
               and r.result in ('won', 'lost')
               and not exists (select 1 from public.hidden_predictions h where h.prediction_id = c.prediction_id)),
           exists (
             select 1 from public.tipster_copies c
             left join public.prediction_results r on r.prediction_id = c.prediction_id
             where c.subscription_id = v_c.subscription_id
               and c.created_at >= v_c.period_start and c.created_at < v_c.period_end
               and r.prediction_id is null
               and not exists (select 1 from public.hidden_predictions h where h.prediction_id = c.prediction_id))
      into v_settled, v_pending;
    if v_settled then
      perform public.tipster_resolve_charge(v_c.id, true, 'Tipster Support period completed');
      v_n := v_n + 1;
    elsif v_pending and v_c.period_end > now() - interval '14 days' then
      continue;
    else
      select username into v_tipster from public.profiles where id = v_c.tipster_id;
      perform public.tipster_resolve_charge(v_c.id, false, 'No settled picks this period: refunded');
      perform public.tipster_notify(v_c.supporter_id, 'Refunded: no picks from @' || v_tipster,
        'No picks from @' || v_tipster || ' settled in your last period, so you have been refunded in full.',
        '/tipster-support');
      v_n := v_n + 1;
    end if;
  end loop;

  -- (b) Renew or end weekly/monthly plans whose period has ended (at the lower of the old and current price).
  for v_s in select * from public.tipster_subscriptions
             where status = 'active' and plan <> 'pick' and period_end <= now()
             order by period_end limit greatest(coalesce(p_limit, 200), 1)
             for update skip locked loop
    v_n := v_n + 1;
    select username into v_tipster from public.profiles where id = v_s.tipster_id;
    select * into v_tp from public.tipster_profiles where user_id = v_s.tipster_id;
    v_price := case v_s.plan when 'week' then v_tp.price_week else v_tp.price_month end;
    if not v_s.auto_renew or v_tp.status is distinct from 'active' or not v_tp.accepting or v_price is null then
      update public.tipster_subscriptions set status = 'expired', ended_at = now(),
             end_reason = case when not v_s.auto_renew then 'not_renewed' else 'tipster_unavailable' end
       where id = v_s.id;
      continue;
    end if;
    v_price := least(v_price, v_s.price);
    perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_s.supporter_id::text));
    begin
      perform public.tipster_check_hold(v_s.supporter_id, v_price);
    exception when others then
      update public.tipster_subscriptions set status = 'expired', ended_at = now(), end_reason = sqlerrm where id = v_s.id;
      perform public.tipster_notify(v_s.supporter_id, 'Tipster Support ended',
        'We could not renew your support for @' || v_tipster || ' (' || sqlerrm || ').', '/tipster-support');
      continue;
    end;
    update public.tipster_subscriptions
       set price = v_price, period_start = greatest(v_s.period_end, now()),
           period_end = greatest(v_s.period_end, now()) + public.tipster_plan_interval(v_s.plan)
     where id = v_s.id
     returning * into v_s;
    insert into public.tipster_charges (subscription_id, supporter_id, tipster_id, kind, amount, period_start, period_end)
    values (v_s.id, v_s.supporter_id, v_s.tipster_id, 'period', v_price, v_s.period_start, v_s.period_end)
    returning id into v_charge;
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_s.supporter_id, 'tipster_hold', -v_price, v_charge::text, 'Tipster Support renewed: @' || v_tipster);
  end loop;
  return v_n;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'puntr-tipster-periods') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'puntr-tipster-periods'));
  end if;
  perform cron.schedule('puntr-tipster-periods', '*/15 * * * *', 'select public.process_tipster_periods(200);');
end $$;

-- 8. Admin. ------------------------------------------------------------------------------------------------------
-- Pause or revoke a tipster (or restore one). Pausing or revoking ends every live support now: held period charges
-- are refunded; held per-pick charges still settle with their pick.
create or replace function public.admin_set_tipster_status(p_user uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s public.tipster_subscriptions;
  v_charge uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('active', 'paused', 'revoked') then raise exception 'invalid_status' using errcode = 'P0001'; end if;
  update public.tipster_profiles set status = p_status, status_reason = left(p_reason, 300), updated_at = now(),
         unlocked_at = coalesce(unlocked_at, case when p_status = 'active' then now() end),
         accepting = case when p_status = 'active' then accepting else false end
   where user_id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_status <> 'active' then
    for v_s in select * from public.tipster_subscriptions where tipster_id = p_user and status in ('active', 'paused')
               for update loop
      for v_charge in select id from public.tipster_charges
                      where subscription_id = v_s.id and kind = 'period' and status = 'held' loop
        perform public.tipster_resolve_charge(v_charge, false, 'Tipster unavailable: refunded');
      end loop;
      update public.tipster_subscriptions set status = 'ended', ended_at = now(), end_reason = 'tipster_' || p_status
       where id = v_s.id;
      perform public.tipster_notify(v_s.supporter_id, 'Tipster Support ended',
        'A tipster you supported is no longer available. Any unused period has been refunded.', '/tipster-support');
    end loop;
  end if;
  insert into public.admin_actions (admin_id, action, target_user, detail)
  values (auth.uid(), 'tipster_status', p_user, jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

create or replace function public.admin_tipster_overview()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(row order by earned desc) from (
    select jsonb_build_object('user_id', t.user_id, 'username', p.username, 'status', t.status,
      'accepting', t.accepting, 'unlocked_at', t.unlocked_at, 'qualified_at', t.qualified_at,
      'supporters', (select count(*) from public.tipster_subscriptions s where s.tipster_id = t.user_id and s.status in ('active', 'paused')),
      'earned_30d', (select coalesce(sum(c.amount - c.fee), 0) from public.tipster_charges c
                     where c.tipster_id = t.user_id and c.status = 'paid' and c.resolved_at > now() - interval '30 days'),
      'refunded_30d', (select coalesce(sum(c.amount), 0) from public.tipster_charges c
                     where c.tipster_id = t.user_id and c.status = 'refunded' and c.resolved_at > now() - interval '30 days')) as row,
      (select coalesce(sum(c.amount - c.fee), 0) from public.tipster_charges c
       where c.tipster_id = t.user_id and c.status = 'paid') as earned
    from public.tipster_profiles t join public.profiles p on p.id = t.user_id) x), '[]'::jsonb);
end;
$$;

-- 9. Reads. ------------------------------------------------------------------------------------------------------
-- Public card on a member's record: is Tipster Support open, prices, supporters, and my own support if any.
create or replace function public.tipster_support_card(p_username text)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when t.user_id is null or t.status <> 'active' then
      jsonb_build_object('available', false, 'username', p.username)
    else jsonb_build_object(
      'available', true,
      'username', p.username,
      'accepting', t.accepting and public.setting_bool('tipster_support_enabled', true),
      'price_pick', t.price_pick, 'price_week', t.price_week, 'price_month', t.price_month,
      'pitch', t.pitch, 'unlocked_at', t.unlocked_at,
      'supporters', (select count(*) from public.tipster_subscriptions s where s.tipster_id = t.user_id and s.status = 'active'),
      'mine', (select jsonb_build_object('id', s.id, 'plan', s.plan, 'price', s.price, 'status', s.status,
                 'auto_renew', s.auto_renew, 'period_end', s.period_end)
               from public.tipster_subscriptions s
               where s.tipster_id = t.user_id and s.supporter_id = auth.uid() and s.status in ('active', 'paused')
               limit 1))
    end
  from public.profiles p
  left join public.tipster_profiles t on t.user_id = p.id
  where p.username = lower(ltrim(btrim(coalesce(p_username, '')), '@'));
$$;

-- Discovery: tipsters open to supporters, by active supporters then win rate.
create or replace function public.top_supported_tipsters(p_limit integer default 12)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(row order by supporters desc, win_rate desc nulls last), '[]'::jsonb) from (
    select jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url, 'founding_number', p.founding_number,
      'price_pick', t.price_pick, 'price_week', t.price_week, 'price_month', t.price_month, 'pitch', t.pitch,
      'supporters', s.n, 'settled', coalesce(ts.settled, 0), 'win_rate', ts.win_rate,
      'form_last_10', coalesce(ts.form_last_10, '')) as row,
      s.n as supporters, ts.win_rate
    from public.tipster_profiles t
    join public.profiles p on p.id = t.user_id
    left join public.tipster_stats ts on ts.user_id = t.user_id
    cross join lateral (select count(*) as n from public.tipster_subscriptions x
                        where x.tipster_id = t.user_id and x.status = 'active') s
    where t.status = 'active' and t.accepting and not p.is_banned
    order by s.n desc, ts.win_rate desc nulls last
    limit least(greatest(coalesce(p_limit, 12), 1), 50)) x;
$$;

-- Everything the signed-in member needs on /tipster-support in one call.
create or replace function public.my_tipster_support()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_pro boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_pro := public.has_entitlement(v_uid, 'pro');
  return jsonb_build_object(
    'enabled', public.setting_bool('tipster_support_enabled', true),
    'progress', public.tipster_streak(v_uid),
    'verified', public.tipster_is_verified(v_uid),
    'is_pro', v_pro,
    'transferable', public.puntpoints_transferable(v_uid),
    'spent_30d', public.tipster_spent_30d(v_uid),
    'limits', jsonb_build_object(
      'support_limit', case when v_pro then public.setting_int('tipster_support_limit_pro', 10)
                            else public.setting_int('tipster_support_limit_free', 2) end,
      'support_limit_pro', public.setting_int('tipster_support_limit_pro', 10),
      'fee_pct', case when v_pro then public.setting_int('tipster_fee_pct_pro', 0) else public.setting_int('tipster_fee_pct', 10) end,
      'fee_pct_free', public.setting_int('tipster_fee_pct', 10),
      'fee_pct_pro', public.setting_int('tipster_fee_pct_pro', 0),
      'spend_cap', public.setting_int('tipster_monthly_spend_cap', 1500),
      'price_pick', jsonb_build_array(public.setting_int('tipster_price_pick_min', 5), public.setting_int('tipster_price_pick_max', 100)),
      'price_week', jsonb_build_array(public.setting_int('tipster_price_week_min', 20), public.setting_int('tipster_price_week_max', 400)),
      'price_month', jsonb_build_array(public.setting_int('tipster_price_month_min', 50), public.setting_int('tipster_price_month_max', 1200))),
    'tipster', (select to_jsonb(t) - 'status_reason' from public.tipster_profiles t where t.user_id = v_uid),
    'supporting', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'tipster', p.username, 'avatar_url', p.avatar_url, 'plan', s.plan, 'price', s.price,
        'status', s.status, 'auto_renew', s.auto_renew, 'period_end', s.period_end, 'created_at', s.created_at,
        'end_reason', s.end_reason,
        'copies', (select count(*) from public.tipster_copies c where c.subscription_id = s.id)) order by s.created_at desc)
      from public.tipster_subscriptions s join public.profiles p on p.id = s.tipster_id
      where s.supporter_id = v_uid and (s.status in ('active', 'paused') or s.ended_at > now() - interval '30 days')), '[]'::jsonb),
    'copies', coalesce((select jsonb_agg(row order by created_at desc) from (
      select jsonb_build_object('prediction_id', pr.id, 'tipster', tp.username, 'market', pr.market,
        'selection', pr.selection, 'line', pr.line, 'odds', pr.odds, 'confidence', pr.confidence,
        'reasoning', pr.reasoning, 'result', r.result, 'note', n.note, 'copied_at', c.created_at,
        'fixture', jsonb_build_object('id', fx.id, 'home', fx.home, 'away', fx.away, 'competition', fx.competition,
          'kickoff_at', fx.kickoff_at, 'status', fx.status, 'home_score', fx.home_score, 'away_score', fx.away_score)) as row,
        c.created_at
      from public.tipster_copies c
      join public.predictions pr on pr.id = c.prediction_id
      join public.fixtures fx on fx.id = pr.fixture_id
      join public.profiles tp on tp.id = c.tipster_id
      left join public.prediction_results r on r.prediction_id = pr.id
      left join public.tipster_pick_notes n on n.prediction_id = pr.id
      where c.supporter_id = v_uid
        and not exists (select 1 from public.hidden_predictions h where h.prediction_id = pr.id)
      order by c.created_at desc limit 50) x), '[]'::jsonb),
    'earnings', jsonb_build_object(
      'supporters', (select count(*) from public.tipster_subscriptions s where s.tipster_id = v_uid and s.status = 'active'),
      'held', (select coalesce(sum(amount), 0) from public.tipster_charges where tipster_id = v_uid and status = 'held'),
      'paid_7d', (select coalesce(sum(amount - fee), 0) from public.tipster_charges
                  where tipster_id = v_uid and status = 'paid' and resolved_at > now() - interval '7 days'),
      'paid_30d', (select coalesce(sum(amount - fee), 0) from public.tipster_charges
                   where tipster_id = v_uid and status = 'paid' and resolved_at > now() - interval '30 days'),
      'paid_all', (select coalesce(sum(amount - fee), 0) from public.tipster_charges where tipster_id = v_uid and status = 'paid'),
      'refunded_30d', (select coalesce(sum(amount), 0) from public.tipster_charges
                       where tipster_id = v_uid and status = 'refunded' and resolved_at > now() - interval '30 days'),
      'by_plan', (select coalesce(jsonb_object_agg(plan, n), '{}'::jsonb) from (
                   select plan, count(*) as n from public.tipster_subscriptions
                   where tipster_id = v_uid and status = 'active' group by plan) z),
      'recent', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'supporter', p.username, 'kind', c.kind,
                   'amount', c.amount, 'fee', c.fee, 'status', c.status, 'created_at', c.created_at) order by c.created_at desc)
                 from (select * from public.tipster_charges where tipster_id = v_uid order by created_at desc limit 20) c
                 join public.profiles p on p.id = c.supporter_id), '[]'::jsonb)),
    'open_picks', coalesce((select jsonb_agg(jsonb_build_object('prediction_id', pr.id, 'home', fx.home, 'away', fx.away,
                   'market', pr.market, 'selection', pr.selection, 'kickoff_at', fx.kickoff_at,
                   'has_note', exists (select 1 from public.tipster_pick_notes n where n.prediction_id = pr.id))
                   order by fx.kickoff_at)
                 from public.predictions pr join public.fixtures fx on fx.id = pr.fixture_id
                 where pr.user_id = v_uid and fx.kickoff_at > now()
                   and exists (select 1 from public.tipster_profiles t where t.user_id = v_uid and t.status = 'active')), '[]'::jsonb));
end;
$$;

-- 10. Grants. ----------------------------------------------------------------------------------------------------
revoke all on function public.tipster_setting_numeric(text, numeric) from public, anon, authenticated;
revoke all on function public.tipster_notify(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.tipster_is_verified(uuid) from public, anon, authenticated;
revoke all on function public.tipster_streak(uuid) from public, anon, authenticated;
revoke all on function public.tipster_check_unlock(uuid) from public, anon, authenticated;
revoke all on function public.tipster_fee_for(uuid, integer) from public, anon, authenticated;
revoke all on function public.tipster_resolve_charge(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.tipster_spent_30d(uuid) from public, anon, authenticated;
revoke all on function public.tipster_check_hold(uuid, integer) from public, anon, authenticated;
revoke all on function public.process_tipster_periods(integer) from public, anon, authenticated;
revoke all on function public.tipster_on_prediction() from public, anon, authenticated;
revoke all on function public.tipster_on_settlement() from public, anon, authenticated;
revoke all on function public.tipster_on_hidden() from public, anon, authenticated;
revoke all on function public.tipster_on_verification() from public, anon, authenticated;
grant execute on function public.process_tipster_periods(integer) to service_role;

revoke all on function public.update_tipster_settings(boolean, integer, integer, integer, text) from public, anon;
revoke all on function public.support_tipster(text, text, boolean) from public, anon;
revoke all on function public.set_tipster_support(uuid, boolean) from public, anon;
revoke all on function public.add_tipster_note(uuid, text) from public, anon;
revoke all on function public.my_tipster_support() from public, anon;
revoke all on function public.admin_set_tipster_status(uuid, text, text) from public, anon;
revoke all on function public.admin_tipster_overview() from public, anon;
grant execute on function public.update_tipster_settings(boolean, integer, integer, integer, text) to authenticated;
grant execute on function public.support_tipster(text, text, boolean) to authenticated;
grant execute on function public.set_tipster_support(uuid, boolean) to authenticated;
grant execute on function public.add_tipster_note(uuid, text) to authenticated;
grant execute on function public.my_tipster_support() to authenticated;
grant execute on function public.admin_set_tipster_status(uuid, text, text) to authenticated;
grant execute on function public.admin_tipster_overview() to authenticated;
grant execute on function public.tipster_support_card(text) to anon, authenticated;
grant execute on function public.top_supported_tipsters(integer) to anon, authenticated;

-- 11. Legal notice versions (Terms §6 Tipster Support, Privacy data table). ------------------------------------
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-28-r26-tipster-support', now(), '/terms'),
       ('privacy', '2026-11-28-tipster-support', now(), '/privacy')
on conflict (kind, version) do nothing;
