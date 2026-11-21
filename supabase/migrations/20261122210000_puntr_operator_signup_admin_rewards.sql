-- 22 Nov 2026: correct identity quest awards, alert Puntr support on signup, disclose legal operator,
-- and reprice the launch rewards catalogue to reduce premature redemption liability.

-- Identity verification is stored as "approved", not "verified". Award the identity quest at approval and
-- backfill already-approved members through the same idempotent award function.
create or replace function public.quest_auto_done(p_user uuid, p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  case p_code
    when 'confirm_email' then
      return exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null);
    when 'enable_mfa' then
      return exists (select 1 from auth.mfa_factors where user_id = p_user and status = 'verified');
    when 'complete_profile' then
      return exists (
        select 1 from public.profiles p join public.member_details d on d.user_id = p.id
        where p.id = p_user and p.avatar_url is not null and coalesce(p.display_name, '') <> ''
          and coalesce(d.first_name, '') <> '' and coalesce(d.last_name, '') <> ''
          and coalesce(d.phone, '') <> '' and d.date_of_birth is not null and coalesce(d.province, '') <> ''
      );
    when 'verify_identity' then
      return exists (
        select 1 from public.identity_verifications
        where user_id = p_user and status = 'approved' and over_18 is true
      );
    when 'email_updates' then
      return public.quest_consent(p_user, 'marketing_email');
    when 'whatsapp_updates' then
      return public.quest_consent(p_user, 'marketing_whatsapp');
    when 'refer_friend' then
      return exists (
        select 1 from public.profiles f join auth.users u on u.id = f.id
        where f.referred_by = p_user and u.email_confirmed_at is not null and not f.is_banned
          and f.username not like 'deleted-%'
      );
    else
      return false;
  end case;
end;
$$;
revoke all on function public.quest_auto_done(uuid, text) from public, anon, authenticated;
grant execute on function public.quest_auto_done(uuid, text) to service_role;

create or replace function public.admin_review_identity(
  p_user uuid,
  p_approve boolean,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select document_path into v_path
  from public.identity_verifications
  where user_id = p_user and status = 'pending';

  if not found then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  update public.identity_verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         over_18 = case when p_approve then true else null end,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         reject_reason = case when p_approve then null else left(nullif(trim(p_reason), ''), 300) end,
         document_path = null
   where user_id = p_user;

  if p_approve and public.reward_setting('points_enabled') then
    perform public.quest_award(p_user, 'verify_identity', auth.uid());
  end if;

  return v_path;
end;
$$;
revoke all on function public.admin_review_identity(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_identity(uuid, boolean, text) to authenticated;

do $$
declare
  r record;
begin
  if public.reward_setting('points_enabled') then
    for r in
      select user_id
      from public.identity_verifications
      where status = 'approved' and over_18 is true
    loop
      perform public.quest_award(r.user_id, 'verify_identity', null);
    end loop;
  end if;
end;
$$;

-- New auth.users rows may not yet have a public.profiles row, so these internal alerts deliberately use
-- user_id = NULL and carry the auth user ID in the body. event_key makes the queue insert idempotent.
alter table public.email_outbox add column if not exists event_key text;
create unique index if not exists email_outbox_event_key_uidx
  on public.email_outbox (event_key)
  where event_key is not null;

create or replace function public.enqueue_support_signup_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.email_outbox (
    user_id, to_email, kind, subject, body, priority, event_key
  )
  values (
    null,
    'support@puntr.co.za',
    'service',
    'New Puntr signup',
    'A new user registered with Puntr South Africa.' || E'\n\n' ||
    'Email: ' || coalesce(new.email, '(not provided)') || E'\n' ||
    'Account ID: ' || new.id::text || E'\n' ||
    'Registered: ' || to_char(new.created_at at time zone 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') || ' SAST' ||
    E'\n\n' || 'Open Admin > Users to review the account details.',
    1,
    'signup:' || new.id::text
  )
  on conflict (event_key) where event_key is not null do nothing;

  return new;
exception when others then
  -- A support-notification failure must never prevent a member from signing up.
  raise warning 'Could not queue Puntr signup notification for auth user %: %', new.id, sqlerrm;
  return new;
end;
$$;
revoke all on function public.enqueue_support_signup_notification() from public, anon, authenticated;
grant execute on function public.enqueue_support_signup_notification() to supabase_auth_admin;

drop trigger if exists puntr_support_signup_notification on auth.users;
create trigger puntr_support_signup_notification
after insert on auth.users
for each row execute function public.enqueue_support_signup_notification();

-- Send queued service alerts around the clock, at five-minute intervals.
select cron.unschedule('email-outbox')
where exists (select 1 from cron.job where jobname = 'email-outbox');
select cron.schedule(
  'email-outbox',
  '*/5 * * * *',
  $$select public.invoke_cron('/api/cron/email-outbox')$$
);

-- The catalogue has no redemptions yet. Reprice launch rewards at five times their previous point costs.
-- For the cash-value OTT vouchers this corresponds to an internal planning ratio of 100 points per R1 face
-- value; it is not a cash value or exchange promise for PuntPoints.
update public.rewards
set points_cost = case code
  when 'ott-r20' then 2000
  when 'ott-r50' then 5000
  when 'ott-r100' then 10000
  when 'ott-r250' then 25000
  when 'ott-r500' then 50000
  when 'credits-10' then 1500
  when 'credits-25' then 3500
  when 'credits-50' then 6500
  when 'pro-7d' then 3750
  when 'pro-30d' then 12500
  when 'merch-cap' then 15000
  when 'merch-tee' then 20000
  when 'merch-mug' then 10000
  when 'sport-scarf' then 25000
  when 'sport-jersey' then 75000
  when 'tickets-psl-2' then 30000
  else points_cost
end
where code in (
  'ott-r20', 'ott-r50', 'ott-r100', 'ott-r250', 'ott-r500',
  'credits-10', 'credits-25', 'credits-50',
  'pro-7d', 'pro-30d', 'merch-cap', 'merch-tee', 'merch-mug',
  'sport-scarf', 'sport-jersey', 'tickets-psl-2'
);

insert into public.notice_versions (kind, version, effective_at, url)
values
  ('terms', '2026-11-22-r22', now(), '/terms'),
  ('privacy', '2026-11-22-r20', now(), '/privacy')
on conflict (kind, version) do nothing;
