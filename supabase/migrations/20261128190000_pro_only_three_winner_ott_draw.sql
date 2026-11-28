-- Extend the 2026 OTT voucher draw to 3 distinct active Puntr Pro members.
alter table public.practice_draw_log
  add column if not exists draw_group_id uuid,
  add column if not exists winner_rank smallint;

update public.practice_draw_log
set draw_group_id = coalesce(draw_group_id, id),
    winner_rank = coalesce(winner_rank, 1)
where draw_group_id is null or winner_rank is null;

alter table public.practice_draw_log
  alter column draw_group_id set default gen_random_uuid(),
  alter column draw_group_id set not null,
  alter column winner_rank set default 1,
  alter column winner_rank set not null;

create unique index if not exists practice_draw_log_group_rank_uidx
  on public.practice_draw_log (draw_group_id, winner_rank);
create unique index if not exists practice_draw_log_group_winner_uidx
  on public.practice_draw_log (draw_group_id, winner_user_id)
  where winner_user_id is not null;

comment on column public.practice_draw_log.draw_group_id is 'Groups the three winners selected in the same OTT voucher draw.';
comment on column public.practice_draw_log.winner_rank is 'Winner position within the draw group (1–3).';

create or replace function public.admin_practice_draw_entries()
returns table(
  user_id uuid,
  username text,
  founding_number integer,
  email text,
  phone text,
  practice_picks bigint,
  entered_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
begin
  return query
  select
    p.id,
    p.username::text,
    p.founding_number,
    u.email::text,
    md.phone::text,
    (select count(*) from public.practice_predictions x where x.user_id = p.id),
    s.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.survey_responses s on s.user_id = p.id and s.draw_entry
  left join public.member_details md on md.user_id = p.id
  where p.founding_number is not null
    and p.role <> 'admin'
    and not p.is_banned
    and coalesce(p.is_ai_participant, false) = false
    and public.has_entitlement(p.id, 'pro')
    and exists (select 1 from public.practice_predictions x where x.user_id = p.id)
  order by s.created_at;
end;
$function$;

drop function if exists public.admin_practice_draw_run(text, text);

create function public.admin_practice_draw_run(p_witness text, p_note text default null)
returns table(
  winner_rank smallint,
  winner_user_id uuid,
  winner_username text,
  winner_founding_number integer,
  winner_email text,
  winner_phone text,
  entries integer,
  drawn_at timestamptz,
  draw_group_id uuid
)
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_entries integer;
  v_win record;
  v_at timestamptz := now();
  v_draw_id uuid := gen_random_uuid();
  v_rank smallint := 0;
begin
  perform pg_advisory_xact_lock(hashtext('puntr_ott_voucher_2026_draw'));

  if v_at < timestamptz '2026-12-31 23:59:59+02' then
    raise exception 'not_closed' using errcode = 'P0001';
  end if;
  if p_witness is null or btrim(p_witness) = '' then
    raise exception 'witness_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.practice_draw_log) then
    raise exception 'already_drawn' using errcode = 'P0001';
  end if;

  select count(*) into v_entries from public.admin_practice_draw_entries();
  if v_entries = 0 then
    raise exception 'no_entries' using errcode = 'P0001';
  end if;
  if v_entries < 3 then
    raise exception 'not_enough_entries' using errcode = 'P0001';
  end if;

  for v_win in
    select e.*
    from public.admin_practice_draw_entries() e
    order by random()
    limit 3
  loop
    v_rank := v_rank + 1;
    insert into public.practice_draw_log (
      draw_group_id, winner_rank, drawn_by, witness, entries,
      winner_user_id, winner_founding_number, note
    ) values (
      v_draw_id, v_rank, auth.uid(), btrim(p_witness), v_entries,
      v_win.user_id, v_win.founding_number, nullif(btrim(coalesce(p_note, '')), '')
    );

    return query
    select
      v_rank,
      v_win.user_id,
      v_win.username,
      v_win.founding_number,
      v_win.email,
      v_win.phone,
      v_entries,
      v_at,
      v_draw_id;
  end loop;

  if v_rank <> 3 then
    raise exception 'not_enough_entries' using errcode = 'P0001';
  end if;
end;
$function$;

revoke all on function public.admin_practice_draw_entries() from public, anon, authenticated;
grant execute on function public.admin_practice_draw_entries() to service_role;
revoke all on function public.admin_practice_draw_run(text, text) from public, anon, authenticated;
grant execute on function public.admin_practice_draw_run(text, text) to service_role;
