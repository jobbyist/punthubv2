-- 13 Nov 2026: members who turned on two-step verification must pass it. The app asks for the code on every page
-- after sign-in (MfaGate); the database now also refuses admin access and reward redemptions from a session that has
-- not passed the second step (JWT aal claim) when the member has a verified factor.

create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and not p.is_banned)
     and public.mfa_ok();
$$;

-- Redemptions need the second step too.
create or replace function public.redeem_reward(p_reward uuid)
returns public.redemptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_r public.rewards;
  v_balance integer;
  v_has_codes boolean;
  v_code public.reward_codes;
  v_red public.redemptions;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.mfa_ok() then
    raise exception 'mfa_required' using errcode = 'P0001';
  end if;
  if not public.reward_setting('rewards_enabled') then
    raise exception 'rewards_disabled' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));

  select * into v_r from public.rewards where id = p_reward and active for update;
  if not found or (v_r.kind = 'betting_voucher' and not public.reward_setting('betting_vouchers_enabled')) then
    raise exception 'reward_not_found' using errcode = 'P0001';
  end if;
  -- Strictly from launch (early-access testers included), or the reward's own later date. Admins may test early.
  if not public.is_admin() and (now() < public.launch_at() or (v_r.available_from is not null and v_r.available_from > now())) then
    raise exception 'not_yet_available' using errcode = 'P0001';
  end if;
  if not public.member_may_redeem(v_uid) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;
  if (select count(*) from public.redemptions
      where user_id = v_uid and status <> 'cancelled'
        and (created_at at time zone 'Africa/Johannesburg')::date = (now() at time zone 'Africa/Johannesburg')::date) >= 5 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  select coalesce(sum(points), 0) into v_balance from public.puntpoints_ledger where user_id = v_uid;
  if v_balance < v_r.points_cost then
    raise exception 'insufficient_points' using errcode = 'P0001';
  end if;

  select exists (select 1 from public.reward_codes where reward_id = v_r.id) into v_has_codes;
  if v_has_codes then
    select * into v_code from public.reward_codes
    where reward_id = v_r.id and redemption_id is null
    order by created_at limit 1 for update skip locked;
    if not found then
      raise exception 'out_of_stock' using errcode = 'P0001';
    end if;
  elsif v_r.stock is not null then
    if v_r.stock <= 0 then
      raise exception 'out_of_stock' using errcode = 'P0001';
    end if;
    update public.rewards set stock = stock - 1 where id = v_r.id;
  end if;

  insert into public.redemptions (user_id, reward_id, points)
  values (v_uid, v_r.id, v_r.points_cost)
  returning * into v_red;

  insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
  values (v_uid, 'spend', -v_r.points_cost, v_red.id::text, v_r.code);

  if v_has_codes then
    update public.reward_codes set redemption_id = v_red.id where id = v_code.id;
  end if;

  if not v_r.requires_approval then
    update public.redemptions
    set status = 'fulfilled', updated_at = now(), voucher_code = case when v_has_codes then v_code.code end
    where id = v_red.id
    returning * into v_red;
  end if;
  return v_red;
end;
$$;
revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated, service_role;
