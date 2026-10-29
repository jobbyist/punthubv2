-- Puntr privacy foundation (P4, POPIA). RLS on every table.
-- Privacy by default: no IP address, user agent or device fingerprint is stored anywhere in this file.

-- ---------------------------------------------------------------------------
-- Deleting an account must not delete the pick chain.
-- profiles.id used to reference auth.users with ON DELETE CASCADE. Deleting the auth user would then try
-- to delete the profile row, which predictions (append-only, ON DELETE RESTRICT) forbids. The profile row
-- stays as a pseudonymous anchor, anonymised by anonymise_account() below.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- ---------------------------------------------------------------------------
-- Usernames: anonymised accounts are renamed deleted-<10 random chars>. Allow exactly that shape, and
-- stop clients from registering a name that looks like it.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username::text ~ '^[a-z0-9_]{3,20}$' or username::text ~ '^deleted-[a-z0-9]{10}$');

create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_client boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if new.birth_year is not null
     and new.birth_year > extract(year from now())::integer - 18 then
    raise exception 'birth_year must be at least 18 years ago' using errcode = 'check_violation';
  end if;

  if v_client then
    if new.username::text like 'deleted-%' then
      raise exception 'reserved username' using errcode = 'check_violation';
    end if;

    if tg_op = 'INSERT' then
      new.role := 'user';
      new.founding_number := null;
      new.is_banned := false;
      new.posting_paused_until := null;
    else
      if new.role is distinct from old.role
         or new.founding_number is distinct from old.founding_number
         or new.is_banned is distinct from old.is_banned
         or new.posting_paused_until is distinct from old.posting_paused_until
         or new.referral_code is distinct from old.referral_code
         or new.referred_by is distinct from old.referred_by
         or new.popia_consent_at is distinct from old.popia_consent_at
         or new.created_at is distinct from old.created_at
         or new.id is distinct from old.id then
        raise exception 'protected profile columns cannot be changed' using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- notice_versions
-- ---------------------------------------------------------------------------
create table public.notice_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('terms', 'privacy', 'marketing', 'tracking')),
  version text not null,
  effective_at timestamptz not null,
  url text not null,
  unique (kind, version)
);

alter table public.notice_versions enable row level security;

create policy notice_versions_public_select on public.notice_versions
  for select to anon, authenticated
  using (true);

revoke all on public.notice_versions from anon, authenticated;
grant select on public.notice_versions to anon, authenticated;
grant all on public.notice_versions to service_role;

insert into public.notice_versions (kind, version, effective_at, url) values
  ('terms', '2026-10-29', '2026-10-29 00:00:00+02', '/terms'),
  ('privacy', '2026-10-29', '2026-10-29 00:00:00+02', '/privacy'),
  ('marketing', '2026-10-29', '2026-10-29 00:00:00+02', '/privacy#marketing'),
  ('tracking', '2026-10-29', '2026-10-29 00:00:00+02', '/cookies');

-- ---------------------------------------------------------------------------
-- consent_records (append-only). The latest row per user and purpose is the current state.
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  user_id uuid references public.profiles (id) on delete restrict,
  anon_id text check (anon_id is null or anon_id ~ '^[a-z0-9-]{16,64}$'),
  purpose text not null check (purpose in (
    'terms', 'privacy_notice', 'marketing_email', 'marketing_whatsapp', 'analytics', 'affiliate_tracking'
  )),
  granted boolean not null,
  notice_version text not null,
  source text not null check (source in ('join', 'banner', 'account')),
  created_at timestamptz not null default now(),
  constraint consent_has_subject check (user_id is not null or anon_id is not null)
);

create index consent_records_user_idx on public.consent_records (user_id, purpose, seq desc);

create trigger consent_records_append_only
  before update or delete on public.consent_records
  for each row execute function public.forbid_mutation();

create trigger consent_records_no_truncate
  before truncate on public.consent_records
  for each statement execute function public.forbid_mutation();

alter table public.consent_records enable row level security;

create policy consent_records_select_own on public.consent_records
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No insert policy: rows are written only through record_consent().
revoke all on public.consent_records from anon, authenticated;
grant select on public.consent_records to authenticated;
grant all on public.consent_records to service_role;

create or replace function public.record_consent(
  p_purpose text,
  p_granted boolean,
  p_notice_version text,
  p_source text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if p_purpose is null or p_granted is null or p_notice_version is null or p_source is null then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.consent_records (user_id, purpose, granted, notice_version, source)
  values (auth.uid(), p_purpose, p_granted, p_notice_version, p_source);
end;
$$;

revoke execute on function public.record_consent(text, boolean, text, text) from public, anon;
grant execute on function public.record_consent(text, boolean, text, text) to authenticated, service_role;

create view public.current_consents with (security_invoker = true) as
  select distinct on (user_id, purpose)
    user_id, purpose, granted, notice_version, source, created_at
  from public.consent_records
  where user_id is not null
  order by user_id, purpose, seq desc;

grant select on public.current_consents to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- privacy_requests. due_at is our own target (30 days), not a statutory deadline.
-- ---------------------------------------------------------------------------
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete restrict,
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 255),
  kind text not null check (kind in ('access', 'correction', 'deletion', 'objection', 'complaint')),
  status text not null default 'received'
    check (status in ('received', 'verifying', 'in_progress', 'closed', 'refused')),
  details text check (details is null or char_length(details) <= 2000),
  received_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '30 days'),
  closed_at timestamptz,
  notes text
);

create index privacy_requests_open_idx on public.privacy_requests (due_at) where closed_at is null;

alter table public.privacy_requests enable row level security;

create policy privacy_requests_admin_select on public.privacy_requests
  for select to authenticated
  using (public.is_admin());

create policy privacy_requests_admin_update on public.privacy_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.privacy_requests from anon, authenticated;
grant select, update on public.privacy_requests to authenticated;
grant all on public.privacy_requests to service_role;

create or replace function public.submit_privacy_request(p_email text, p_kind text, p_details text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 255 then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if p_kind not in ('access', 'correction', 'deletion', 'objection', 'complaint') then
    raise exception 'invalid_kind' using errcode = 'P0001';
  end if;
  if p_details is not null and char_length(p_details) > 2000 then
    raise exception 'details_too_long' using errcode = 'P0001';
  end if;
  if (select count(*) from public.privacy_requests
      where email = v_email and received_at > now() - interval '24 hours') >= 3 then
    raise exception 'too_many_requests' using errcode = 'P0001';
  end if;

  insert into public.privacy_requests (user_id, email, kind, details)
  values (auth.uid(), v_email, p_kind, nullif(btrim(coalesce(p_details, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_privacy_request(text, text, text) from public;
grant execute on function public.submit_privacy_request(text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- breach_register (admin only)
-- ---------------------------------------------------------------------------
create table public.breach_register (
  id uuid primary key default gen_random_uuid(),
  discovered_at timestamptz not null,
  description text not null,
  data_types text,
  subjects_affected integer check (subjects_affected is null or subjects_affected >= 0),
  contained_at timestamptz,
  regulator_notified_at timestamptz,
  subjects_notified_at timestamptz,
  outcome text,
  created_at timestamptz not null default now()
);

alter table public.breach_register enable row level security;

create policy breach_register_admin_all on public.breach_register
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.breach_register from anon, authenticated;
grant select, insert, update on public.breach_register to authenticated;
grant all on public.breach_register to service_role;

-- ---------------------------------------------------------------------------
-- early_access: marketing consent is explicit and starts false.
-- Every existing row is treated as having given no marketing consent (opt-out is not consent under POPIA).
-- ---------------------------------------------------------------------------
alter table public.early_access add column marketing_consent boolean not null default false;
update public.early_access set marketing_consent = false;

create policy early_access_admin_select on public.early_access
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Data export for the signed-in user (access request)
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_clicks jsonb := null;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Affiliate click logs arrive with P12. Included only if that table exists and holds rows for this user.
  if to_regclass('public.affiliate_clicks') is not null then
    execute 'select coalesce(jsonb_agg(to_jsonb(c)), ''[]''::jsonb) from public.affiliate_clicks c where c.user_id = $1'
      into v_clicks using v_uid;
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'role' from public.profiles p where p.id = v_uid),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.seq) from public.consent_records c where c.user_id = v_uid), '[]'::jsonb),
    'predictions', coalesce((select jsonb_agg(to_jsonb(pr) order by pr.seq) from public.predictions pr where pr.user_id = v_uid), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.reports r where r.reporter_id = v_uid), '[]'::jsonb),
    'affiliate_clicks', v_clicks
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Account deletion with an append-only record.
-- Removes email, phone and birth year, renames the user to deleted-<random>, switches marketing off and
-- removes any waitlist row for the email. The pseudonymous user_id stays on picks so the hash chain still
-- verifies. The server then deletes the auth user (which holds the email) with the Admin API.
-- ---------------------------------------------------------------------------
create or replace function public.anonymise_account(p_user uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set username = 'deleted-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
      display_name = 'Deleted user',
      birth_year = null,
      marketing_opt_in = false,
      referral_code = null
  where id = p_user;

  if p_email is not null then
    delete from public.early_access where lower(email) = lower(p_email);
  end if;

  insert into public.consent_records (user_id, purpose, granted, notice_version, source)
  select p_user, purpose, false, (select max(version) from public.notice_versions where kind = 'privacy'), 'account'
  from (values ('marketing_email'), ('marketing_whatsapp'), ('analytics'), ('affiliate_tracking')) v(purpose);

  update public.privacy_requests
  set status = 'closed', closed_at = now(), notes = coalesce(notes || E'\n', '') || 'Account anonymised'
  where user_id = p_user and kind = 'deletion' and closed_at is null;
end;
$$;

revoke execute on function public.anonymise_account(uuid, text) from public, anon, authenticated;
grant execute on function public.anonymise_account(uuid, text) to service_role;
