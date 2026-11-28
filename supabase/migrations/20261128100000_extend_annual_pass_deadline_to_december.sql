-- Extend the Founding Annual Pass reservation deadline through 31 December 2026.
-- The 20-pass cap, payment flow, 48-hour reservation holds, and offline-payment accounting remain unchanged.

create or replace function public.annual_pass_offer()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'remaining', greatest(20 - t.taken, 0),
    'open', now() <= timestamptz '2026-12-31 23:59:59+02' and t.taken < 20
  ) from (select public.annual_pass_taken() as taken) t;
$$;
grant execute on function public.annual_pass_offer() to anon, authenticated;

create or replace function public.claim_annual_pass()
returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cap constant int := 20;
  v_deadline constant timestamptz := timestamptz '2026-12-31 23:59:59+02';
  v_row public.annual_pass_claims%rowtype;
  v_taken int;
  v_hold timestamptz := least(now() + interval '48 hours', v_deadline);
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role <> 'admin') then
    return jsonb_build_object('status', 'not_member');
  end if;
  perform pg_advisory_xact_lock(hashtext('annual_pass_claims'));
  select * into v_row from public.annual_pass_claims where user_id = v_uid;
  v_taken := public.annual_pass_taken();
  if found and v_row.status = 'paid' then
    return jsonb_build_object('status', 'already_paid', 'remaining', greatest(v_cap - v_taken, 0));
  end if;
  if found and v_row.status = 'pending' and v_row.hold_expires_at > now() then
    return jsonb_build_object('status', 'already_pending', 'hold_expires_at', v_row.hold_expires_at,
                              'remaining', greatest(v_cap - v_taken, 0));
  end if;
  if now() > v_deadline then
    return jsonb_build_object('status', 'closed', 'remaining', greatest(v_cap - v_taken, 0));
  end if;
  if v_taken >= v_cap then
    return jsonb_build_object('status', 'full', 'remaining', 0);
  end if;
  insert into public.annual_pass_claims (user_id, status, hold_expires_at, claimed_at)
  values (v_uid, 'pending', v_hold, now())
  on conflict (user_id) do update set status = 'pending', hold_expires_at = v_hold, claimed_at = now();
  return jsonb_build_object('status', 'claimed', 'hold_expires_at', v_hold, 'remaining', v_cap - v_taken - 1);
end;
$$;
revoke all on function public.claim_annual_pass() from public, anon;
grant execute on function public.claim_annual_pass() to authenticated;

insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-28-r25-annual-pass-deadline', now(), '/terms')
on conflict (kind, version) do nothing;
