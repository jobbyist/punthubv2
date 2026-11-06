-- Founding Member welcome email (new sign-ups) and the limited Annual Pass offer:
-- the first 20 founding members to claim before 16 Nov 2026 (23:59 SAST). A claim reserves the offer price;
-- no payment is taken until checkout opens.

-- 1. Welcome email sends: one per address, marketing-consented registered members only.
create table if not exists public.founding_welcome_sends (
  email text primary key,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz not null default now()
);
alter table public.founding_welcome_sends enable row level security;
drop policy if exists founding_welcome_sends_admin on public.founding_welcome_sends;
create policy founding_welcome_sends_admin on public.founding_welcome_sends
  for select to authenticated using (public.is_admin());

-- Members who registered before this change already receive the Annual Pass email, so they are not sent the welcome.
create or replace function public.founding_welcome_recipients()
returns table (recipient_email text, recipient_name text)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select lower(u.email), coalesce(nullif(p.display_name, ''), p.username::text)
  from public.profiles p join auth.users u on u.id = p.id
  where p.role <> 'admin'
    and p.marketing_opt_in
    and p.created_at >= timestamptz '2026-11-06 04:00:00+02'
    and u.email is not null
    and not exists (select 1 from public.waitlist_unsubscribes w where w.email = lower(u.email))
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(u.email))
    and not exists (select 1 from public.founding_welcome_sends s where s.email = lower(u.email) and s.status = 'sent');
$$;
revoke all on function public.founding_welcome_recipients() from public, anon, authenticated;
grant execute on function public.founding_welcome_recipients() to service_role;

-- 2. Annual Pass claims.
create table if not exists public.annual_pass_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.annual_pass_claims enable row level security;
drop policy if exists annual_pass_claims_own on public.annual_pass_claims;
create policy annual_pass_claims_own on public.annual_pass_claims
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Claim (idempotent). Returns {status: claimed|already|full|closed|not_member, position, remaining}.
create or replace function public.claim_annual_pass()
returns jsonb
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cap constant int := 20;
  v_deadline constant timestamptz := timestamptz '2026-11-16 23:59:59+02';
  v_count int;
  v_pos int;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role <> 'admin') then
    return jsonb_build_object('status', 'not_member');
  end if;
  perform pg_advisory_xact_lock(hashtext('annual_pass_claims'));
  select count(*) into v_count from public.annual_pass_claims;
  if exists (select 1 from public.annual_pass_claims where user_id = v_uid) then
    select count(*) into v_pos from public.annual_pass_claims
      where claimed_at <= (select claimed_at from public.annual_pass_claims where user_id = v_uid);
    return jsonb_build_object('status', 'already', 'position', v_pos, 'remaining', greatest(v_cap - v_count, 0));
  end if;
  if now() > v_deadline then
    return jsonb_build_object('status', 'closed', 'remaining', greatest(v_cap - v_count, 0));
  end if;
  if v_count >= v_cap then
    return jsonb_build_object('status', 'full', 'remaining', 0);
  end if;
  insert into public.annual_pass_claims (user_id) values (v_uid);
  return jsonb_build_object('status', 'claimed', 'position', v_count + 1, 'remaining', v_cap - v_count - 1);
end;
$$;
revoke all on function public.claim_annual_pass() from public, anon;
grant execute on function public.claim_annual_pass() to authenticated;

-- Public, read-only: how many spots are left and whether the offer is still open.
create or replace function public.annual_pass_offer()
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'remaining', greatest(20 - (select count(*) from public.annual_pass_claims), 0),
    'open', now() <= timestamptz '2026-11-16 23:59:59+02' and (select count(*) from public.annual_pass_claims) < 20
  );
$$;
grant execute on function public.annual_pass_offer() to anon, authenticated;

-- 3. Send welcome emails shortly after sign-up (every 10 minutes). Idempotent.
select cron.unschedule('founding-welcome') where exists (select 1 from cron.job where jobname = 'founding-welcome');
select cron.schedule('founding-welcome', '*/10 * * * *', $$select public.invoke_cron('/api/cron/founding-welcome')$$);
