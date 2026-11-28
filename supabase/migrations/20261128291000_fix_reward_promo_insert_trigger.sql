-- AFTER INSERT is required: the promotion snapshot references the newly inserted reward row.
create or replace function public.apply_reward_cost_promo_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.points_cost > 0 and now() < timestamptz '2027-01-01 00:00:00+02' then
    insert into public.puntpoints_reward_cost_promotions(
      reward_id, base_points_cost, promotional_points_cost, starts_at, ends_at
    ) values (
      new.id, new.points_cost, new.points_cost * 3,
      timestamptz '2026-11-28 00:00:00+02', timestamptz '2027-01-01 00:00:00+02'
    ) on conflict (reward_id) do nothing;
    update public.rewards set points_cost = new.points_cost * 3 where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists rewards_apply_cost_promo on public.rewards;
create trigger rewards_apply_cost_promo
after insert on public.rewards
for each row execute function public.apply_reward_cost_promo_on_insert();
