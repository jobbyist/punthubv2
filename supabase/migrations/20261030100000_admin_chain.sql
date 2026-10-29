-- P11: admin corrections and the nightly chain head.

-- ---------------------------------------------------------------------------
-- admin_settle_prediction: a correction is a NEW settlement event with source 'admin', a required reason and the
-- admin's id. The earlier events stay forever; prediction_results shows the latest. Units are computed here from
-- the pick's odds, never taken from the caller.
-- ---------------------------------------------------------------------------
create or replace function public.admin_settle_prediction(p_prediction uuid, p_result text, p_reason text)
returns public.settlement_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_odds numeric;
  v_units numeric;
  v_row public.settlement_events;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_result is null or p_result not in ('won', 'lost', 'void') then
    raise exception 'invalid_result' using errcode = 'P0001';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select odds into v_odds from public.predictions where id = p_prediction;
  if not found then
    raise exception 'prediction_not_found' using errcode = 'P0001';
  end if;
  v_units := case p_result when 'won' then v_odds - 1 when 'lost' then -1 else 0 end;

  insert into public.settlement_events (prediction_id, result, units, source, reason, admin_id)
  values (p_prediction, p_result, v_units, 'admin', btrim(p_reason), auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.admin_settle_prediction(uuid, text, text) from public, anon;
grant execute on function public.admin_settle_prediction(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- write_chain_head: recomputes a Johannesburg day's chain head from the picks themselves (last pick of the day,
-- its hash, the day's pick count) and writes it. create_prediction already maintains the row on every pick, so
-- this nightly run makes it a checked, repairable record. Returns the row, or nothing if there were no picks.
-- ---------------------------------------------------------------------------
create or replace function public.write_chain_head(p_day date)
returns table (day date, pick_count integer, hash text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_last public.predictions;
  v_count integer;
begin
  select * into v_last
  from public.predictions
  where (created_at at time zone 'Africa/Johannesburg')::date = p_day
  order by seq desc
  limit 1;
  if not found then
    return;
  end if;
  select count(*)::integer into v_count
  from public.predictions
  where (created_at at time zone 'Africa/Johannesburg')::date = p_day;

  insert into public.chain_heads (day, last_prediction_id, hash, pick_count)
  values (p_day, v_last.id, v_last.hash, v_count)
  on conflict (day) do update
    set last_prediction_id = excluded.last_prediction_id,
        hash = excluded.hash,
        pick_count = excluded.pick_count;

  return query select p_day, v_count, v_last.hash;
end;
$$;

revoke all on function public.write_chain_head(date) from public, anon, authenticated;
grant execute on function public.write_chain_head(date) to service_role;

-- 21:55 UTC is 23:55 in Johannesburg, so the route writes that day's head just before midnight.
select cron.schedule('chain-head', '55 21 * * *', $$select public.invoke_cron('/api/cron/chain-head')$$);
