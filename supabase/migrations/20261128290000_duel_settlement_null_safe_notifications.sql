-- A missing score must never turn a settlement notification body into NULL.
create or replace function public.settle_duel(p_duel uuid, p_results jsonb, p_void boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duel public.duels;
  v_c integer;
  v_o integer;
  v_winner uuid;
  v_fixture public.fixtures;
begin
  select * into v_duel from public.duels where id = p_duel for update;
  if not found or v_duel.status <> 'active' then return 'skipped'; end if;
  select * into v_fixture from public.fixtures where id = v_duel.fixture_id;

  if p_void then
    update public.duels set status = 'void', settled_at = now() where id = p_duel;
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel void: match not played');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel void: match not played');
    return 'void';
  end if;

  update public.duel_picks p set correct = (r->>'correct')::boolean
  from jsonb_array_elements(p_results) r
  where p.duel_id = p_duel and p.user_id = (r->>'user_id')::uuid and p.market = r->>'market';
  if exists (select 1 from public.duel_picks where duel_id = p_duel and correct is null) then
    raise exception 'incomplete_results' using errcode = 'P0001';
  end if;

  select count(*) filter (where user_id = v_duel.challenger and correct),
         count(*) filter (where user_id = v_duel.opponent and correct)
    into v_c, v_o from public.duel_picks where duel_id = p_duel;
  v_winner := case when v_c > v_o then v_duel.challenger when v_o > v_c then v_duel.opponent else null end;

  update public.duels set status = 'settled', settled_at = now(), challenger_correct = v_c,
    opponent_correct = v_o, winner = v_winner where id = p_duel;

  if v_winner is null then
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel drawn: stake returned');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel drawn: stake returned');
  elsif v_duel.stake > 0 then
    if exists (select 1 from public.profiles where id = v_winner and is_ai_participant) then
      insert into public.ai_sports_wallets(user_id, allocated_points, balance)
      values (v_winner, 10000, 2 * v_duel.stake)
      on conflict (user_id) do update
        set balance = public.ai_sports_wallets.balance + excluded.balance, updated_at = now();
    else
      insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
      values (v_winner, 'duel_payout', 2 * v_duel.stake, p_duel::text, 'Duel won: pot');
    end if;
  end if;

  perform public.duel_notify(
    u,
    case when v_winner is null then 'Duel drawn' when v_winner = u then 'You won your duel' else 'Duel settled' end,
    coalesce(v_fixture.home, 'Home') || ' ' || coalesce(v_fixture.home_score::text, '?')
      || '-' || coalesce(v_fixture.away_score::text, '?') || ' ' || coalesce(v_fixture.away, 'Away')
      || ': ' || v_c || ' vs ' || v_o || ' correct calls.',
    '/duels/' || p_duel::text
  )
  from unnest(array[v_duel.challenger, v_duel.opponent]) u
  where not exists (select 1 from public.profiles p where p.id = u and p.is_ai_participant);
  return case when v_winner is null then 'draw' else 'settled' end;
end;
$$;
