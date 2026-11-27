-- First-party PFIE learning: explicit consent, user activity and withdrawal.
-- User events are stored separately from campaign analytics and never expose raw user IDs
-- in the training view. Synthetic QA remains a secondary source.

alter table public.consent_records drop constraint if exists consent_records_purpose_check;
alter table public.consent_records add constraint consent_records_purpose_check
  check (purpose in ('terms','privacy_notice','marketing_email','marketing_whatsapp','analytics','affiliate_tracking','pfie_learning'));

alter table public.pfie_learning_ingest_runs add column if not exists activity_events_seen integer not null default 0;
alter table public.pfie_learning_ingest_runs add column if not exists real_examples_inserted integer not null default 0;

insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy','2026-11-27-pfie-learning','2026-11-27 00:00:00+02','/privacy#pfie-learning')
on conflict (kind, version) do nothing;

create table if not exists public.pfie_user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'fixture_viewed','pfie_insight_opened','prediction_created','newsroom_article_viewed',
    'newsroom_category_selected','notification_clicked','notification_dropdown_opened',
    'share_clicked','referral_link_copied','user_activated','profile_created',
    'signup_completed','pricing_plan_selected','founding_cta_clicked',
    'landing_viewed','about_page_viewed','about_founding_cta_clicked',
    'market_filter_changed','sport_filter_changed','search_submitted'
  )),
  fixture_id uuid references public.fixtures(id) on delete set null,
  event_data jsonb not null default '{}'::jsonb,
  source text not null default 'client' check (source in ('client','prediction_trigger')),
  created_at timestamptz not null default now(),
  check (octet_length(event_data::text) <= 2048)
);
create index if not exists pfie_user_activity_events_created_idx on public.pfie_user_activity_events(created_at, id);
create index if not exists pfie_user_activity_events_user_idx on public.pfie_user_activity_events(user_id, created_at);
alter table public.pfie_user_activity_events enable row level security;
revoke all on public.pfie_user_activity_events from anon, authenticated;
grant insert on public.pfie_user_activity_events to authenticated;
grant all on public.pfie_user_activity_events to service_role;

create policy pfie_user_activity_insert_own on public.pfie_user_activity_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.current_consents c
      where c.user_id = auth.uid() and c.purpose = 'pfie_learning' and c.granted = true)
  );

create table if not exists public.pfie_learning_subject_map (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  subject_key text not null unique,
  created_at timestamptz not null default now()
);
alter table public.pfie_learning_subject_map enable row level security;
revoke all on public.pfie_learning_subject_map from anon, authenticated;
grant all on public.pfie_learning_subject_map to service_role;

alter table public.pfie_learning_examples add column if not exists subject_key text;
alter table public.pfie_learning_examples drop constraint if exists pfie_learning_examples_source_kind_check;
alter table public.pfie_learning_examples add constraint pfie_learning_examples_source_kind_check
  check (source_kind in ('synthetic_session','synthetic_research','real_activity_event'));
alter table public.pfie_learning_examples drop constraint if exists pfie_learning_examples_task_type_check;
alter table public.pfie_learning_examples add constraint pfie_learning_examples_task_type_check
  check (task_type in ('route_quality','forecast_evaluation','behavioral_preference'));
create index if not exists pfie_learning_examples_subject_idx
  on public.pfie_learning_examples(subject_key) where subject_key is not null;

create or replace view public.pfie_training_dataset
with (security_invoker = true) as
select id, task_type, source_kind, fixture_key, payload, label, provenance, created_at, reviewed_at
from public.pfie_learning_examples
where training_status = 'approved' and label_status = 'verified';
revoke all on public.pfie_training_dataset from anon, authenticated;
grant select on public.pfie_training_dataset to service_role;

-- Published pick actions are captured only after separate PFIE-learning consent.
-- They represent human preference, never objective match-outcome truth.
create or replace function public.pfie_capture_consented_prediction()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.current_consents c
    where c.user_id = new.user_id and c.purpose = 'pfie_learning' and c.granted = true) then
    insert into public.pfie_user_activity_events(user_id,event_type,fixture_id,event_data,source)
    values (new.user_id,'prediction_created',new.fixture_id,
      jsonb_build_object('market',left(new.market,80),'selection',left(new.selection,120),
        'line',new.line,'odds',new.odds,'confidence',new.confidence),'prediction_trigger');
  end if;
  return new;
end;
$$;
drop trigger if exists pfie_capture_consented_prediction on public.predictions;
create trigger pfie_capture_consented_prediction after insert on public.predictions
for each row execute function public.pfie_capture_consented_prediction();

create or replace function public.pfie_validate_user_activity_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_key text;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'activity_subject_mismatch' using errcode = '42501';
  end if;
  if not exists (select 1 from public.current_consents c
    where c.user_id = new.user_id and c.purpose = 'pfie_learning' and c.granted = true) then
    raise exception 'pfie_learning_consent_required' using errcode = '42501';
  end if;
  if new.source <> 'client' then raise exception 'invalid_activity_source' using errcode = '42501'; end if;
  for v_key in select jsonb_object_keys(new.event_data) loop
    if v_key not in ('sport','competition','market','category','slug','what','source','position') then
      raise exception 'activity_payload_key_not_allowed' using errcode = '22023';
    end if;
    if jsonb_typeof(new.event_data -> v_key) <> 'string' or length(new.event_data ->> v_key) > 80 then
      raise exception 'invalid_activity_payload_value' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists pfie_validate_user_activity_event on public.pfie_user_activity_events;
create trigger pfie_validate_user_activity_event before insert on public.pfie_user_activity_events
for each row when (new.source = 'client') execute function public.pfie_validate_user_activity_event();

-- Include the member's raw PFIE learning events in their data-access export.
create or replace function public.export_my_pfie_learning_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'pfie_learning_events',
    coalesce((select jsonb_agg(jsonb_build_object(
      'event_type', e.event_type, 'fixture_id', e.fixture_id,
      'event_data', e.event_data, 'source', e.source, 'created_at', e.created_at
    ) order by e.created_at) from public.pfie_user_activity_events e where e.user_id = v_uid), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.export_my_pfie_learning_data() from public, anon;
grant execute on function public.export_my_pfie_learning_data() to authenticated, service_role;

-- Account anonymisation also removes this optional learning purpose's raw and derived records.
create or replace function public.pfie_purge_learning_on_account_anonymise()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_subject_key text;
begin
  if new.username::text like 'deleted-%' and old.username::text not like 'deleted-%' then
    select subject_key into v_subject_key from public.pfie_learning_subject_map where user_id = new.id;
    if v_subject_key is not null then
      delete from public.pfie_learning_examples where subject_key = v_subject_key;
    end if;
    delete from public.pfie_user_activity_events where user_id = new.id;
    delete from public.pfie_learning_subject_map where user_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists pfie_purge_learning_on_account_anonymise on public.profiles;
create trigger pfie_purge_learning_on_account_anonymise
  after update of username on public.profiles
  for each row execute function public.pfie_purge_learning_on_account_anonymise();
