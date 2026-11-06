-- 1. Annual Pass: claiming now includes payment (R299 once-off, PayFast). A claim holds a place for 48 hours; the
--    place is confirmed only when payment is received. Unpaid holds expire and free the place.
alter table public.annual_pass_claims
  add column if not exists status text not null default 'pending' check (status in ('pending', 'paid')),
  add column if not exists hold_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_reference text,
  add column if not exists amount_cents integer;

-- Places taken = paid, plus unexpired holds.
create or replace function public.annual_pass_taken()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from public.annual_pass_claims
  where status = 'paid' or (status = 'pending' and hold_expires_at > now());
$$;
revoke all on function public.annual_pass_taken() from public, anon, authenticated;
grant execute on function public.annual_pass_taken() to service_role;

-- Claim (idempotent): holds a place pending payment.
-- Returns {status: claimed|already_pending|already_paid|full|closed|not_member, hold_expires_at, remaining}.
create or replace function public.claim_annual_pass()
returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cap constant int := 20;
  v_deadline constant timestamptz := timestamptz '2026-11-16 23:59:59+02';
  v_row public.annual_pass_claims%rowtype;
  v_taken int;
  v_hold timestamptz := now() + interval '48 hours';
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

create or replace function public.annual_pass_offer()
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'remaining', greatest(20 - t.taken, 0),
    'open', now() <= timestamptz '2026-11-16 23:59:59+02' and t.taken < 20
  )
  from (select public.annual_pass_taken() as taken) t;
$$;
grant execute on function public.annual_pass_offer() to anon, authenticated;

-- Called only by the payment webhook (service role) once PayFast confirms R299. Idempotent. A payment that arrives
-- after a hold expired is still recorded as paid (the person has paid); if that exceeds 20 places an admin refunds
-- or honours it.
create or replace function public.confirm_annual_pass_payment(p_user uuid, p_reference text, p_amount_cents integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_amount_cents is distinct from 29900 then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;
  perform pg_advisory_xact_lock(hashtext('annual_pass_claims'));
  insert into public.annual_pass_claims (user_id, status, paid_at, payment_reference, amount_cents, hold_expires_at)
  values (p_user, 'paid', now(), p_reference, p_amount_cents, null)
  on conflict (user_id) do update
    set status = 'paid', paid_at = coalesce(public.annual_pass_claims.paid_at, now()),
        payment_reference = coalesce(public.annual_pass_claims.payment_reference, p_reference),
        amount_cents = p_amount_cents, hold_expires_at = null;
  return jsonb_build_object('status', 'paid');
end;
$$;
revoke all on function public.confirm_annual_pass_payment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.confirm_annual_pass_payment(uuid, text, integer) to service_role;

-- 2. Profile pictures: a public avatars bucket (compressed WebP/JPEG/PNG, small), one folder per member.
alter table public.profiles add column if not exists avatar_url text;

create or replace view public.public_profiles as
  select id, username::text as username, display_name, founding_number, created_at, avatar_url
  from public.profiles
  where not is_banned;
alter view public.public_profiles set (security_invoker = false);
alter view public.public_profiles owner to postgres;
grant select on public.public_profiles to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 1048576,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
