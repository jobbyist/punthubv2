-- Identity verification (KYC), phase 1: manual review for Founding Members (owner decision, 6 Nov 2026).
-- A member uploads a photo or scan of their South African ID (green ID book, smart ID card) or passport.
-- An admin checks it against the member's name and birth year and approves or rejects it. The document is deleted
-- as soon as a decision is made; Puntr keeps only the outcome (status, over-18, who decided, when). No ID number is
-- ever typed into or stored in a database column. Verification is required before redeeming any reward.
-- Phase 2 (after launch): VerifyNow API for real-time SA ID checks (method = 'verifynow').

create table if not exists public.identity_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  method text not null default 'manual' check (method in ('manual', 'verifynow')),
  document_path text,
  over_18 boolean,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  -- Approved always means 18+ confirmed; nothing else carries an age result.
  constraint identity_verifications_over_18 check ((status = 'approved') = coalesce(over_18, false))
);
alter table public.identity_verifications enable row level security;
drop policy if exists identity_verifications_select on public.identity_verifications;
create policy identity_verifications_select on public.identity_verifications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: writes go through the functions below.

-- Private bucket for ID documents: never public, 10 MB cap, images or PDF. Members may only upload into their own
-- folder. Nobody can list or read documents through the API; admins view them through short-lived signed URLs made
-- on the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('id-documents', 'id-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists id_documents_insert_own on storage.objects;
create policy id_documents_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Member: register an uploaded document for review. Idempotent; refused once approved.
create or replace function public.submit_identity_document(p_path text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  -- Exactly "<own user id>/<file name>": one level, no other folders.
  if p_path is null or p_path !~ ('^' || v_uid::text || '/[^/]+$') then
    raise exception 'bad_path' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.identity_verifications where user_id = v_uid and status = 'approved') then
    return jsonb_build_object('status', 'approved');
  end if;
  select document_path into v_old from public.identity_verifications where user_id = v_uid;
  insert into public.identity_verifications (user_id, status, method, document_path, submitted_at,
                                             reviewed_at, reviewed_by, reject_reason, over_18)
  values (v_uid, 'pending', 'manual', p_path, now(), null, null, null, null)
  on conflict (user_id) do update set status = 'pending', method = 'manual', document_path = p_path,
    submitted_at = now(), reviewed_at = null, reviewed_by = null, reject_reason = null, over_18 = null;
  -- The caller deletes a replaced document (returned here) so only one copy is ever held.
  return jsonb_build_object('status', 'pending', 'replaced', v_old);
end;
$$;
revoke all on function public.submit_identity_document(text) from public, anon;
grant execute on function public.submit_identity_document(text) to authenticated;

-- Admin: queue of pending submissions with the member details needed to compare.
create or replace function public.admin_identity_queue()
returns table (user_id uuid, username text, display_name text, birth_year integer, first_name text,
               last_name text, document_path text, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select v.user_id, p.username::text, p.display_name, p.birth_year, d.first_name, d.last_name,
           v.document_path, v.submitted_at
    from public.identity_verifications v
    join public.profiles p on p.id = v.user_id
    left join public.member_details d on d.user_id = v.user_id
    where v.status = 'pending'
    order by v.submitted_at;
end;
$$;
revoke all on function public.admin_identity_queue() from public, anon;
grant execute on function public.admin_identity_queue() to authenticated;

-- Admin: decide. Clears the stored path (the server deletes the file) and returns it.
create or replace function public.admin_review_identity(p_user uuid, p_approve boolean, p_reason text default null)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select document_path into v_path from public.identity_verifications where user_id = p_user and status = 'pending';
  if not found then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;
  update public.identity_verifications
     set status = case when p_approve then 'approved' else 'rejected' end,
         over_18 = case when p_approve then true else null end,
         reviewed_at = now(), reviewed_by = auth.uid(),
         reject_reason = case when p_approve then null else left(nullif(trim(p_reason), ''), 300) end,
         document_path = null
   where user_id = p_user;
  return v_path;
end;
$$;
revoke all on function public.admin_review_identity(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_identity(uuid, boolean, text) to authenticated;

-- Rewards need a verified identity: checked on every new redemption, whichever path creates it.
create or replace function public.redemptions_require_identity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.identity_verifications
                 where user_id = new.user_id and status = 'approved') then
    raise exception 'identity_not_verified' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists redemptions_require_identity on public.redemptions;
create trigger redemptions_require_identity before insert on public.redemptions
  for each row execute function public.redemptions_require_identity();

-- Privacy r8 / Terms r10: identity verification.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-06-r10', now(), '/terms'), ('privacy', '2026-11-06-r8', now(), '/privacy')
on conflict (kind, version) do nothing;

-- Retention: a document that is never checked is deleted after 30 days (row marked rejected so the member can
-- resubmit). The file itself is removed by the daily cron route /api/cron/identity-retention.
create or replace function public.identity_expired_documents()
returns table (user_id uuid, document_path text)
language sql stable security definer set search_path = public, pg_temp as $$
  select user_id, document_path from public.identity_verifications
  where status = 'pending' and document_path is not null and submitted_at < now() - interval '30 days';
$$;
revoke all on function public.identity_expired_documents() from public, anon, authenticated;
grant execute on function public.identity_expired_documents() to service_role;

select cron.unschedule('identity-retention') where exists (select 1 from cron.job where jobname = 'identity-retention');
select cron.schedule('identity-retention', '15 1 * * *', $$select public.invoke_cron('/api/cron/identity-retention')$$);
