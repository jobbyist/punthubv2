-- Puntr Pro recurring billing through PayFast subscriptions (14 Nov 2026). Off until app_settings.payments_enabled
-- is 'true' and the PayFast variables are set, same switch as the PAYG credit packs.
--
-- Access model: a paid month (or the Annual Pass) is a 'pro' row in user_entitlements with an expiry. Each COMPLETE
-- ITN extends it by one month plus a 3-day grace period, so a late renewal does not cut a member off. A failed or
-- cancelled subscription simply stops extending it: access ends when the paid period does. Nothing is refunded
-- automatically; refunds follow /refunds.
--
-- Fair use: Pro includes AI actions up to a monthly and a daily cap (app_settings, defaults 90 and 15). Past a cap,
-- the action costs credits like Pay-As-You-Go. Admins are never capped.

insert into public.app_settings (key, value) values
  ('pro_cap_monthly', '90'),
  ('pro_cap_daily', '15'),
  ('pro_cap_annual_pass', '90')
on conflict (key) do nothing;

-- 1. Subscriptions and their payments. -------------------------------------------------------------------------
create table if not exists public.pro_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'ended')),
  amount_cents integer not null check (amount_cents > 0),
  pf_token text unique,
  entitlement_id uuid references public.user_entitlements (id) on delete set null,
  current_period_end timestamptz,
  cancel_requested_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pro_subscriptions_user_idx on public.pro_subscriptions (user_id, created_at desc);
-- One live subscription per member (pending ones are cleaned up when a newer checkout starts).
create unique index if not exists pro_subscriptions_one_live
  on public.pro_subscriptions (user_id) where status in ('active', 'past_due');

create table if not exists public.pro_payments (
  pf_payment_id text primary key,
  subscription_id uuid not null references public.pro_subscriptions (id) on delete restrict,
  amount_cents integer not null,
  paid_at timestamptz not null default now()
);

alter table public.pro_subscriptions enable row level security;
alter table public.pro_payments enable row level security;
drop policy if exists pro_subscriptions_own_select on public.pro_subscriptions;
create policy pro_subscriptions_own_select on public.pro_subscriptions
  for select to authenticated using (user_id = auth.uid());
revoke all on public.pro_subscriptions, public.pro_payments from anon, authenticated;
grant select on public.pro_subscriptions to authenticated;
grant select, insert, update on public.pro_subscriptions, public.pro_payments to service_role;

-- 2. Grant a paid month. Idempotent per PayFast payment; the amount must match the subscription exactly. ---------
create or replace function public.grant_pro_payment(
  p_sub uuid, p_pf_payment_id text, p_token text, p_amount_cents integer
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_s public.pro_subscriptions%rowtype;
  v_end timestamptz;
begin
  select * into v_s from public.pro_subscriptions where id = p_sub for update;
  if not found then return 'not_found'; end if;
  if exists (select 1 from public.pro_payments where pf_payment_id = p_pf_payment_id) then return 'already_paid'; end if;
  if v_s.amount_cents <> p_amount_cents then return 'amount_mismatch'; end if;

  insert into public.pro_payments (pf_payment_id, subscription_id, amount_cents)
  values (p_pf_payment_id, p_sub, p_amount_cents);
  v_end := greatest(coalesce(v_s.current_period_end, now()), now()) + interval '1 month';

  if v_s.entitlement_id is not null and exists (select 1 from public.user_entitlements where id = v_s.entitlement_id) then
    update public.user_entitlements set expires_at = v_end + interval '3 days', revoked_at = null
    where id = v_s.entitlement_id;
  else
    insert into public.user_entitlements (user_id, entitlement, note, starts_at, expires_at)
    values (v_s.user_id, 'pro', 'payfast_subscription', now(), v_end + interval '3 days')
    returning id into v_s.entitlement_id;
  end if;

  update public.pro_subscriptions
  set status = case when status = 'cancelled' then 'cancelled' else 'active' end,
      pf_token = coalesce(nullif(p_token, ''), pf_token),
      entitlement_id = v_s.entitlement_id,
      current_period_end = v_end
  where id = p_sub;
  update public.profiles set account_type = 'pro' where id = v_s.user_id and account_type <> 'pro';
  return 'granted';
end;
$$;

-- 3. Failed renewal or cancellation: stop extending; access lasts until the paid period (plus grace) ends. ------
create or replace function public.set_pro_subscription_status(p_sub uuid, p_status text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_status not in ('past_due', 'cancelled') then return 'bad_status'; end if;
  update public.pro_subscriptions
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end
  where id = p_sub and status in ('pending', 'active', 'past_due');
  return case when found then 'ok' else 'unchanged' end;
end;
$$;

-- 4. Housekeeping: subscriptions whose access has run out become 'ended' and the profile goes back to free. -----
create or replace function public.end_lapsed_pro()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  with ended as (
    update public.pro_subscriptions s set status = 'ended'
    where s.status in ('active', 'past_due', 'cancelled')
      and s.current_period_end is not null and s.current_period_end + interval '3 days' < now()
    returning s.user_id
  )
  update public.profiles p set account_type = 'free'
  from ended e
  where p.id = e.user_id and p.account_type = 'pro' and not public.has_entitlement(p.id, 'pro');
  get diagnostics v_n = row_count;
  -- Pending checkouts nobody completed within a day are dropped.
  delete from public.pro_subscriptions where status = 'pending' and created_at < now() - interval '1 day'
    and not exists (select 1 from public.pro_payments pp where pp.subscription_id = pro_subscriptions.id);
  return v_n;
end;
$$;

revoke all on function public.grant_pro_payment(uuid, text, text, integer),
  public.set_pro_subscription_status(uuid, text), public.end_lapsed_pro() from public, anon, authenticated;
grant execute on function public.grant_pro_payment(uuid, text, text, integer),
  public.set_pro_subscription_status(uuid, text), public.end_lapsed_pro() to service_role;

select cron.unschedule('pro-lapse') where exists (select 1 from cron.job where jobname = 'pro-lapse');
select cron.schedule('pro-lapse', '20 1 * * *', $$select public.end_lapsed_pro()$$);

-- 5. Annual Pass: 12 months of Pro from launch day for every paid claim (as /pricing and /terms promise). --------
create or replace function public.grant_annual_pass_pro(p_user uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.user_entitlements where user_id = p_user and entitlement = 'pro'
             and note = 'annual_pass' and revoked_at is null) then
    return;
  end if;
  insert into public.user_entitlements (user_id, entitlement, note, starts_at, expires_at)
  values (p_user, 'pro', 'annual_pass', '2026-12-01 00:00:00+02', '2027-12-01 00:00:00+02');
end;
$$;
revoke all on function public.grant_annual_pass_pro(uuid) from public, anon, authenticated;
grant execute on function public.grant_annual_pass_pro(uuid) to service_role;

create or replace function public.annual_pass_paid_grant_pro()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform public.grant_annual_pass_pro(new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists annual_pass_paid_grant_pro on public.annual_pass_claims;
create trigger annual_pass_paid_grant_pro after insert or update of status on public.annual_pass_claims
  for each row execute function public.annual_pass_paid_grant_pro();

select public.grant_annual_pass_pro(user_id) from public.annual_pass_claims where status = 'paid';

-- 6. Fair use inside spend_credits. Included uses are logged once per ref in pro_usage. ------------------------
create table if not exists public.pro_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  ref_id text not null,
  feature text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, ref_id)
);
create index if not exists pro_usage_recent_idx on public.pro_usage (user_id, used_at desc);
alter table public.pro_usage enable row level security;
drop policy if exists pro_usage_own_select on public.pro_usage;
create policy pro_usage_own_select on public.pro_usage for select to authenticated using (user_id = auth.uid());
revoke all on public.pro_usage from anon, authenticated;
grant select on public.pro_usage to authenticated;
grant select, insert, delete on public.pro_usage to service_role;

create or replace function public.pro_cap(p_user uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when exists (select 1 from public.user_entitlements e where e.user_id = p_user and e.entitlement = 'pro'
                 and e.note is distinct from 'annual_pass' and e.revoked_at is null and e.starts_at <= now()
                 and (e.expires_at is null or e.expires_at > now()))
      then coalesce((select value::integer from public.app_settings where key = 'pro_cap_monthly'), 90)
    else coalesce((select value::integer from public.app_settings where key = 'pro_cap_annual_pass'), 90)
  end;
$$;

create or replace function public.spend_credits(p_feature text, p_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_price public.credit_prices;
  v_problem text;
  v_month integer;
  v_day integer;
  v_capped boolean := false;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if p_ref is null or char_length(p_ref) not between 3 and 120 then raise exception 'bad_ref' using errcode = 'P0001'; end if;
  select * into v_price from public.credit_prices where feature = p_feature and active;
  if not found then raise exception 'unknown_feature' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  v_problem := public.member_can_transact(v_profile);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;

  if public.is_admin() then
    return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'included');
  end if;

  perform pg_advisory_xact_lock(hashtext('credits:' || v_uid::text));

  if public.has_entitlement(v_uid, 'pro') or v_profile.account_type = 'pro' then
    if exists (select 1 from public.pro_usage where user_id = v_uid and ref_id = p_ref) then
      return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'included');
    end if;
    select count(*) filter (where used_at > now() - interval '30 days'),
           count(*) filter (where used_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg')
                                              at time zone 'Africa/Johannesburg')
      into v_month, v_day
      from public.pro_usage where user_id = v_uid and used_at > now() - interval '30 days';
    if v_month < public.pro_cap(v_uid)
       and v_day < coalesce((select value::integer from public.app_settings where key = 'pro_cap_daily'), 15) then
      insert into public.pro_usage (user_id, ref_id, feature) values (v_uid, p_ref, p_feature);
      return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'included');
    end if;
    v_capped := true; -- past the fair-use cap: the action costs credits like Pay-As-You-Go
  end if;

  if exists (select 1 from public.credit_ledger where user_id = v_uid and kind = 'spend' and ref_id = p_ref) then
    return jsonb_build_object('charged', 0, 'balance', public.credit_balance(v_uid), 'reason', 'already_paid');
  end if;
  if public.credit_balance(v_uid) < v_price.credits then
    raise exception '%', case when v_capped then 'fair_use_reached' else 'insufficient_credits' end using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, kind, credits, feature, ref_id, reason)
  values (v_uid, 'spend', -v_price.credits, p_feature, p_ref, v_price.title);
  return jsonb_build_object('charged', v_price.credits, 'balance', public.credit_balance(v_uid),
                            'reason', case when v_capped then 'fair_use_charged' else 'charged' end);
end;
$$;
revoke all on function public.spend_credits(text, text) from public, anon;
grant execute on function public.spend_credits(text, text) to authenticated, service_role;
revoke all on function public.pro_cap(uuid) from public, anon, authenticated;
grant execute on function public.pro_cap(uuid) to service_role;

-- 7. Account deletion: pro_usage cascades with the profile; subscriptions and payments are kept (financial records,
-- linked only to the anonymised profile id).
