-- 13 Nov 2026: redeemable rewards catalogue (owner request). Visible now as a preview, redeemable from launch
-- (1 Dec 2026 00:00 SAST, public.launch_at()), or from a later per-reward date.
-- Categories: OTT vouchers (from R20), Puntr Pay-As-You-Go credit packs, Puntr Pro passes, Puntr merchandise,
-- sports merchandise and accessories, match tickets. Points costs are proposed values the owner edits in Admin >
-- Rewards. PuntPoints are never cash; nothing here sells points or rewards for money.

alter table public.rewards
  add column if not exists category text,
  add column if not exists face_value_cents integer check (face_value_cents is null or face_value_cents between 0 and 10000000),
  add column if not exists available_from timestamptz,
  add column if not exists fulfilment text not null default 'manual',
  add column if not exists sort integer not null default 100,
  add column if not exists terms text check (terms is null or char_length(terms) <= 600);

do $$
begin
  alter table public.rewards add constraint rewards_category_check
    check (category is null or category in ('ott_voucher', 'credit_pack', 'pro_pass', 'puntr_merch', 'sports_merch', 'match_tickets'));
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.rewards add constraint rewards_fulfilment_check
    check (fulfilment in ('manual', 'code', 'credits', 'pro', 'shipping', 'tickets'));
exception when duplicate_object then null;
end $$;

-- Public catalogue preview: active rewards with whether they can be redeemed yet. Anyone may look; betting vouchers
-- are never in the preview (they are shown only to eligible signed-in members through list_rewards()).
create or replace function public.rewards_catalogue()
returns table (
  id uuid, code text, title text, description text, kind text, category text, points_cost integer,
  face_value_cents integer, sponsor text, fulfilment text, terms text, in_stock boolean,
  available boolean, available_from timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.code, r.title, r.description, r.kind, r.category, r.points_cost, r.face_value_cents, r.sponsor,
    r.fulfilment, r.terms,
    case
      when exists (select 1 from public.reward_codes c where c.reward_id = r.id)
        then exists (select 1 from public.reward_codes c where c.reward_id = r.id and c.redemption_id is null)
      else r.stock is null or r.stock > 0
    end,
    public.reward_setting('rewards_enabled') and now() >= public.launch_at()
      and (r.available_from is null or r.available_from <= now()),
    greatest(coalesce(r.available_from, '-infinity'::timestamptz), public.launch_at())
  from public.rewards r
  where r.active and r.kind <> 'betting_voucher' and r.category is not null
  order by r.sort, r.points_cost, r.title;
$$;
revoke all on function public.rewards_catalogue() from public;
grant execute on function public.rewards_catalogue() to anon, authenticated, service_role;

-- Redemption: same as before plus the launch gate and the per-reward date. Admins may redeem early to test.
create or replace function public.redeem_reward(p_reward uuid)
returns public.redemptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_r public.rewards;
  v_balance integer;
  v_has_codes boolean;
  v_code public.reward_codes;
  v_red public.redemptions;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.reward_setting('rewards_enabled') then
    raise exception 'rewards_disabled' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));

  select * into v_r from public.rewards where id = p_reward and active for update;
  if not found or (v_r.kind = 'betting_voucher' and not public.reward_setting('betting_vouchers_enabled')) then
    raise exception 'reward_not_found' using errcode = 'P0001';
  end if;
  -- Strictly from launch (early-access testers included), or the reward's own later date. Admins may test early.
  if not public.is_admin() and (now() < public.launch_at() or (v_r.available_from is not null and v_r.available_from > now())) then
    raise exception 'not_yet_available' using errcode = 'P0001';
  end if;
  if not public.member_may_redeem(v_uid) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;
  if (select count(*) from public.redemptions
      where user_id = v_uid and status <> 'cancelled'
        and (created_at at time zone 'Africa/Johannesburg')::date = (now() at time zone 'Africa/Johannesburg')::date) >= 5 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  select coalesce(sum(points), 0) into v_balance from public.puntpoints_ledger where user_id = v_uid;
  if v_balance < v_r.points_cost then
    raise exception 'insufficient_points' using errcode = 'P0001';
  end if;

  select exists (select 1 from public.reward_codes where reward_id = v_r.id) into v_has_codes;
  if v_has_codes then
    select * into v_code from public.reward_codes
    where reward_id = v_r.id and redemption_id is null
    order by created_at limit 1 for update skip locked;
    if not found then
      raise exception 'out_of_stock' using errcode = 'P0001';
    end if;
  elsif v_r.stock is not null then
    if v_r.stock <= 0 then
      raise exception 'out_of_stock' using errcode = 'P0001';
    end if;
    update public.rewards set stock = stock - 1 where id = v_r.id;
  end if;

  insert into public.redemptions (user_id, reward_id, points)
  values (v_uid, v_r.id, v_r.points_cost)
  returning * into v_red;

  insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
  values (v_uid, 'spend', -v_r.points_cost, v_red.id::text, v_r.code);

  if v_has_codes then
    update public.reward_codes set redemption_id = v_red.id where id = v_code.id;
  end if;

  if not v_r.requires_approval then
    update public.redemptions
    set status = 'fulfilled', updated_at = now(), voucher_code = case when v_has_codes then v_code.code end
    where id = v_red.id
    returning * into v_red;
  end if;
  return v_red;
end;
$$;
revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated, service_role;

-- Starter catalogue (proposed points; idempotent on code). Everything needs admin approval: codes, credits, Pro time,
-- shipping and tickets are fulfilled from Admin > Rewards. Stock-limited physical items start with small stock.
insert into public.rewards
  (code, title, description, kind, category, points_cost, face_value_cents, stock, sponsor, requires_approval, active,
   fulfilment, sort, terms)
values
  ('ott-r20',  'OTT voucher R20',  'R20 OTT voucher, emailed as a code you can use at participating OTT merchants.', 'retail_voucher', 'ott_voucher', 400,  2000,  null, null, true, true, 'code', 10, 'Delivered by email within 2 working days. OTT terms apply. No cash value from Puntr.'),
  ('ott-r50',  'OTT voucher R50',  'R50 OTT voucher, emailed as a code.', 'retail_voucher', 'ott_voucher', 1000, 5000,  null, null, true, true, 'code', 11, 'Delivered by email within 2 working days. OTT terms apply. No cash value from Puntr.'),
  ('ott-r100', 'OTT voucher R100', 'R100 OTT voucher, emailed as a code.', 'retail_voucher', 'ott_voucher', 2000, 10000, null, null, true, true, 'code', 12, 'Delivered by email within 2 working days. OTT terms apply. No cash value from Puntr.'),
  ('ott-r250', 'OTT voucher R250', 'R250 OTT voucher, emailed as a code.', 'retail_voucher', 'ott_voucher', 5000, 25000, null, null, true, true, 'code', 13, 'Delivered by email within 2 working days. OTT terms apply. No cash value from Puntr.'),
  ('ott-r500', 'OTT voucher R500', 'R500 OTT voucher, emailed as a code.', 'retail_voucher', 'ott_voucher', 10000, 50000, null, null, true, true, 'code', 14, 'Delivered by email within 2 working days. OTT terms apply. No cash value from Puntr.'),
  ('credits-10', '10 Pay-As-You-Go credits', 'Ten Puntr credits for match intelligence reports and deep stats.', 'perk', 'credit_pack', 300,  null, null, null, true, true, 'credits', 20, 'Added to your wallet. Credits cannot be sent to others or exchanged for cash.'),
  ('credits-25', '25 Pay-As-You-Go credits', 'Twenty-five Puntr credits.', 'perk', 'credit_pack', 700,  null, null, null, true, true, 'credits', 21, 'Added to your wallet. Credits cannot be sent to others or exchanged for cash.'),
  ('credits-50', '50 Pay-As-You-Go credits', 'Fifty Puntr credits.', 'perk', 'credit_pack', 1300, null, null, null, true, true, 'credits', 22, 'Added to your wallet. Credits cannot be sent to others or exchanged for cash.'),
  ('pro-7d',  'Puntr Pro: 7 days',  'A week of Puntr Pro, free.', 'perk', 'pro_pass', 750,  null, null, null, true, true, 'pro', 30, 'Starts when we approve the request. Does not renew and is never billed.'),
  ('pro-30d', 'Puntr Pro: 30 days', 'A month of Puntr Pro, free.', 'perk', 'pro_pass', 2500, null, null, null, true, true, 'pro', 31, 'Starts when we approve the request. Does not renew and is never billed.'),
  ('merch-cap',   'Puntr cap',     'Black Puntr cap with the green logo.', 'perk', 'puntr_merch', 3000, null, 25, null, true, true, 'shipping', 40, 'South African addresses only. Delivery in about 10 working days. While stocks last.'),
  ('merch-tee',   'Puntr T-shirt', 'Puntr T-shirt, sizes S to XXL.', 'perk', 'puntr_merch', 4000, null, 25, null, true, true, 'shipping', 41, 'South African addresses only. We confirm your size by email. While stocks last.'),
  ('merch-mug',   'Puntr mug',     'Puntr mug for match day.', 'perk', 'puntr_merch', 2000, null, 25, null, true, true, 'shipping', 42, 'South African addresses only. While stocks last.'),
  ('sport-scarf',  'Club scarf (PSL)',  'Official scarf of your Betway Premiership club.', 'perk', 'sports_merch', 5000,  null, 10, null, true, true, 'shipping', 50, 'Choose your club by email. Subject to availability. South African addresses only.'),
  ('sport-jersey', 'Club replica jersey', 'Official replica jersey of your club (PSL or EPL).', 'perk', 'sports_merch', 15000, null, 5, null, true, true, 'shipping', 51, 'Choose your club and size by email. Subject to availability. South African addresses only.'),
  ('tickets-psl-2', 'Two PSL match tickets', 'Two tickets to a Betway Premiership match of your choice in South Africa.', 'sponsored', 'match_tickets', 6000, null, 5, null, true, true, 'tickets', 60, 'Subject to availability for the chosen match. Tickets are issued in the member''s name; travel not included.')
on conflict (code) do nothing;
