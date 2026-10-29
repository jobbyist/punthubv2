-- Fixes write_chain_head from 20261030100000: its output columns (day, hash, pick_count) shared names with the
-- chain_heads columns, which made the upsert ambiguous. The output columns are renamed.

drop function if exists public.write_chain_head(date);

create or replace function public.write_chain_head(p_day date)
returns table (head_day date, head_pick_count integer, head_hash text)
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

  insert into public.chain_heads as ch (day, last_prediction_id, hash, pick_count)
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
