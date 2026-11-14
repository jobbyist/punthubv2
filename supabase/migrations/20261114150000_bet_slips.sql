-- Betting slips (14 Nov 2026, pre-MVP phase). Members record a bookmaker slip by manual entry, pasted text or a
-- photo/screenshot. Photos are read ON THE DEVICE (no image goes to an AI service); the extracted text is scrubbed
-- of personal details in the browser and on the server before Gemini structures it. The member reviews and edits
-- every field, then publishes: each leg on a known fixture with a supported market becomes a normal time-stamped
-- Puntr pick (create_prediction, so the launch gate, 18+, email/MFA checks, points and leaderboards all apply).
-- Slip images sit in a private bucket, readable only by their owner, and are deleted after 30 days.
-- Privacy r18.

create table if not exists public.bet_slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'published', 'deleted')),
  source text not null check (source in ('manual', 'text', 'image', 'import')),
  -- Future bookmaker integrations (share links, APIs) set these; see docs/BETTING_SLIPS.md.
  import_provider text check (import_provider is null or char_length(import_provider) <= 40),
  import_ref text check (import_ref is null or char_length(import_ref) <= 120),
  bookmaker text check (bookmaker is null or char_length(bookmaker) <= 40),
  bet_type text not null default 'single' check (bet_type in ('single', 'multi', 'system')),
  stake numeric(10, 2) check (stake is null or (stake > 0 and stake <= 1000000)),
  total_odds numeric(10, 2) check (total_odds is null or (total_odds >= 1 and total_odds <= 1000000)),
  potential_return numeric(12, 2) check (potential_return is null or potential_return >= 0),
  show_stake boolean not null default false,
  note text check (note is null or char_length(note) <= 280),
  image_path text,
  image_expires_at timestamptz,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists bet_slips_user_idx on public.bet_slips (user_id, created_at desc);
create index if not exists bet_slips_published_idx on public.bet_slips (published_at desc) where status = 'published';
create unique index if not exists bet_slips_import_idx on public.bet_slips (user_id, import_provider, import_ref)
  where import_ref is not null;

create table if not exists public.bet_slip_legs (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references public.bet_slips (id) on delete cascade,
  position smallint not null check (position between 1 and 30),
  fixture_id uuid references public.fixtures (id) on delete set null,
  home text check (home is null or char_length(home) <= 80),
  away text check (away is null or char_length(away) <= 80),
  competition text check (competition is null or char_length(competition) <= 80),
  market text check (market is null or market in ('1X2', 'OU25', 'BTTS', 'DC')),
  selection text check (selection is null or char_length(selection) <= 20),
  odds numeric(8, 2) check (odds is null or (odds >= 1.01 and odds <= 1000)),
  raw_market text check (raw_market is null or char_length(raw_market) <= 120),
  raw_selection text check (raw_selection is null or char_length(raw_selection) <= 120),
  prediction_id uuid references public.predictions (id) on delete set null,
  unique (slip_id, position)
);
create index if not exists bet_slip_legs_slip_idx on public.bet_slip_legs (slip_id);

-- AI parse attempts: per-member daily limit and monitoring. Stores no slip text.
create table if not exists public.slip_parses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('text', 'image')),
  chars integer not null default 0,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists slip_parses_user_day_idx on public.slip_parses (user_id, created_at desc);

alter table public.bet_slips enable row level security;
alter table public.bet_slip_legs enable row level security;
alter table public.slip_parses enable row level security;

drop policy if exists bet_slips_own on public.bet_slips;
create policy bet_slips_own on public.bet_slips for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bet_slip_legs_own on public.bet_slip_legs;
create policy bet_slip_legs_own on public.bet_slip_legs for all to authenticated
  using (exists (select 1 from public.bet_slips s where s.id = slip_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.bet_slips s where s.id = slip_id and s.user_id = auth.uid()
                      and s.status = 'draft'));

revoke all on public.bet_slips, public.bet_slip_legs, public.slip_parses from anon, authenticated;
grant select, insert, update on public.bet_slips to authenticated;
grant select, insert, update, delete on public.bet_slip_legs to authenticated;
grant select, insert, update, delete on public.bet_slips, public.bet_slip_legs, public.slip_parses to service_role;

-- A published slip is frozen (its picks are on the permanent record); only show_stake/note/delete may change.
create or replace function public.bet_slips_before_update()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  -- Only publish_slip() may publish (it creates the picks first).
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published')
     and coalesce(current_setting('puntr.publishing', true), '') <> 'on' then
    raise exception 'use_publish' using errcode = 'P0001';
  end if;
  -- An image path must sit in the owner's own folder (the daily job deletes whatever path is stored).
  if new.image_path is not null and new.image_path not like new.user_id::text || '/%' then
    raise exception 'bad_image_path' using errcode = 'P0001';
  end if;
  if new.image_path is not null and new.image_path like '%..%' then
    raise exception 'bad_image_path' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  -- Account deletion clears personal fields on published slips.
  if coalesce(current_setting('puntr.erasing', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if old.status = 'published' and new.status = 'published' and (
       new.bookmaker is distinct from old.bookmaker or new.stake is distinct from old.stake
       or new.total_odds is distinct from old.total_odds or new.potential_return is distinct from old.potential_return
       or new.bet_type is distinct from old.bet_type or new.source is distinct from old.source) then
    raise exception 'slip_published' using errcode = 'P0001';
  end if;
  if old.status = 'published' and new.status = 'draft' then
    raise exception 'slip_published' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists bet_slips_before_update on public.bet_slips;
create trigger bet_slips_before_update before insert or update on public.bet_slips
  for each row execute function public.bet_slips_before_update();

-- Publish: turn each eligible leg into a pick (all or nothing), then mark the slip published.
create or replace function public.publish_slip(p_slip uuid, p_confidence integer default 3)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_slip public.bet_slips;
  v_leg public.bet_slip_legs;
  v_pred public.predictions;
  v_picks integer := 0;
  v_tracked integer := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_slip from public.bet_slips where id = p_slip and user_id = v_uid for update;
  if not found or v_slip.status <> 'draft' then raise exception 'slip_unavailable' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.bet_slip_legs where slip_id = p_slip) then
    raise exception 'slip_empty' using errcode = 'P0001';
  end if;
  if (select count(*) from public.bet_slips where user_id = v_uid and status = 'published'
      and published_at > now() - interval '1 day') >= 20 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;
  for v_leg in select * from public.bet_slip_legs where slip_id = p_slip order by position loop
    if v_leg.fixture_id is not null and v_leg.market is not null and v_leg.selection is not null then
      v_pred := public.create_prediction(v_leg.fixture_id, v_leg.market, v_leg.selection, null,
                                         coalesce(v_leg.odds, 2), greatest(1, least(5, p_confidence)),
                                         left('From a betting slip', 500));
      update public.bet_slip_legs set prediction_id = v_pred.id where id = v_leg.id;
      v_picks := v_picks + 1;
    else
      v_tracked := v_tracked + 1;
    end if;
  end loop;
  perform set_config('puntr.publishing', 'on', true);
  update public.bet_slips set status = 'published', published_at = now() where id = p_slip;
  perform set_config('puntr.publishing', '', true);
  return jsonb_build_object('picks', v_picks, 'tracked_only', v_tracked);
end;
$$;

-- Leg and slip results from the picks' latest settlement. Untracked legs keep the slip at 'partial' unless a
-- tracked leg lost.
create or replace function public.slip_detail(p_slip uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  with legs as (
    select l.*, (select e.result from public.settlement_events e where e.prediction_id = l.prediction_id
                 order by e.seq desc limit 1) as result
    from public.bet_slip_legs l where l.slip_id = p_slip
  )
  select jsonb_build_object(
    'id', s.id, 'status', s.status, 'source', s.source, 'bet_type', s.bet_type,
    'bookmaker', case when s.user_id = auth.uid() then s.bookmaker end,
    'stake', case when s.user_id = auth.uid() or s.show_stake then s.stake end,
    'potential_return', case when s.user_id = auth.uid() or s.show_stake then s.potential_return end,
    'total_odds', s.total_odds, 'show_stake', s.show_stake, 'note', s.note,
    'created_at', s.created_at, 'published_at', s.published_at,
    'mine', s.user_id = auth.uid(),
    'username', p.username,
    'result', case
      when exists (select 1 from legs where result = 'lost') then 'lost'
      when exists (select 1 from legs where prediction_id is not null and result is null) then 'pending'
      when exists (select 1 from legs where prediction_id is null) then 'partial'
      when not exists (select 1 from legs where result = 'won') then 'void'
      else 'won' end,
    'legs', coalesce((select jsonb_agg(jsonb_build_object(
        'position', l.position, 'fixture_id', l.fixture_id, 'home', l.home, 'away', l.away,
        'competition', l.competition, 'market', l.market, 'selection', l.selection, 'odds', l.odds,
        'raw_market', l.raw_market, 'raw_selection', l.raw_selection, 'prediction_id', l.prediction_id,
        'result', l.result) order by l.position) from legs l), '[]'::jsonb))
  from public.bet_slips s join public.profiles p on p.id = s.user_id
  where s.id = p_slip and (s.user_id = auth.uid() or s.status = 'published');
$$;

create or replace function public.slips_feed(p_scope text, p_limit integer default 30)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(public.slip_detail(s.id) order by coalesce(s.published_at, s.created_at) desc), '[]'::jsonb)
  from (
    select id, published_at, created_at from public.bet_slips
    where case p_scope
      when 'community' then status = 'published'
      when 'mine' then auth.uid() is not null and user_id = auth.uid() and status in ('draft', 'published')
      else false end
    order by coalesce(published_at, created_at) desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) s;
$$;

-- Deletion: drafts are marked deleted, personal fields cleared and images removed by the daily job; a published
-- slip's picks stay on the record (they are append-only).
create or replace function public.slips_on_anonymise()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.username::text like 'deleted-%' and old.username::text not like 'deleted-%' then
    perform set_config('puntr.erasing', 'on', true);
    -- Drafts become 'deleted'; every image expires now so the daily job removes the files.
    update public.bet_slips set status = case when status = 'published' then status else 'deleted' end, stake = null, potential_return = null, bookmaker = null, note = null,
      image_expires_at = now(), show_stake = false where user_id = new.id;
    perform set_config('puntr.erasing', '', true);
    delete from public.slip_parses where user_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists slips_on_anonymise on public.profiles;
create trigger slips_on_anonymise after update of username on public.profiles
  for each row execute function public.slips_on_anonymise();

revoke all on function public.bet_slips_before_update(), public.publish_slip(uuid, integer),
  public.slip_detail(uuid), public.slips_feed(text, integer), public.slips_on_anonymise() from public, anon, authenticated;
grant execute on function public.publish_slip(uuid, integer) to authenticated;
grant execute on function public.slip_detail(uuid), public.slips_feed(text, integer) to anon, authenticated;

-- Private image bucket: members read/write only their own folder; 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists slips_own_read on storage.objects;
create policy slips_own_read on storage.objects for select to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists slips_own_insert on storage.objects;
create policy slips_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists slips_own_delete on storage.objects;
create policy slips_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'slips' and (storage.foldername(name))[1] = auth.uid()::text);

-- Images expire after 30 days: the daily job removes the file through the Storage API and clears the path.
select cron.unschedule('slip-images') where exists (select 1 from cron.job where jobname = 'slip-images');
select cron.schedule('slip-images', '25 1 * * *', $$select public.invoke_cron('/api/cron/slip-images')$$);
