-- PuntPoints (loyalty ledger), referral vesting and the rewards catalogue.
--
-- Everything ships SWITCHED OFF and with proposed values the owner can edit in /admin (decisions D18 to D22):
-- the master switches in reward_settings are false, every point rule and milestone is inactive, and the catalogue
-- is empty. Points are never cash and never purchasable; nothing here reads or changes picks, results, ranking or
-- the leaderboard. Betting vouchers have their own switch.

-- ---------------------------------------------------------------------------
-- Switches (admin only)
-- ---------------------------------------------------------------------------
create table public.reward_settings (
  key text primary key check (key in ('points_enabled', 'rewards_enabled', 'betting_vouchers_enabled')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.reward_settings (key) values ('points_enabled'), ('rewards_enabled'), ('betting_vouchers_enabled');

create or replace function public.reward_setting(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select enabled from public.reward_settings where key = p_key), false);
$$;
revoke all on function public.reward_setting(text) from public, anon, authenticated;
grant execute on function public.reward_setting(text) to service_role;

-- ---------------------------------------------------------------------------
-- Point rules (editable; proposed values, all inactive)
-- ---------------------------------------------------------------------------
create table public.point_rules (
  code text primary key,
  title text not null,
  points integer not null check (points > 0),
  cap_per_day integer check (cap_per_day is null or cap_per_day > 0),
  cap_per_month integer check (cap_per_month is null or cap_per_month > 0),
  active boolean not null default false,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.point_rules (code, title, points, cap_per_day, cap_per_month, sort) values
  ('confirm_email', 'Confirm your email', 10, null, null, 1),
  ('first_pick', 'Post your first pick', 20, null, null, 2),
  ('pick_locked', 'Lock a pick', 2, 10, null, 3),
  ('pick_settled', 'A pick you posted settles', 3, null, null, 4),
  ('referral_referred', 'Join through a friend''s invite', 25, null, null, 5),
  ('referral_referrer', 'A friend you invited posts a first pick', 25, null, 20, 6),
  ('referral_milestone', 'Invite milestone bonus', 1, null, null, 7);

create table public.referral_milestones (
  threshold integer primary key check (threshold > 0),
  title text not null,
  bonus_points integer not null check (bonus_points > 0),
  active boolean not null default false
);
insert into public.referral_milestones (threshold, title, bonus_points) values
  (3, 'Founding Ambassador', 100),
  (10, 'Super Connector', 300),
  (25, 'Puntr Champion', 800);

-- ---------------------------------------------------------------------------
-- The ledger: append-only. A member's balance is the sum of their rows.
-- ---------------------------------------------------------------------------
create table public.puntpoints_ledger (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('award', 'spend', 'refund', 'adjust', 'reversal')),
  rule_code text,
  points integer not null check (points <> 0),
  ref_id text,
  reason text,
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One award per member, rule and reference: awards are idempotent.
create unique index puntpoints_award_once on public.puntpoints_ledger (user_id, rule_code, ref_id) where kind = 'award';
create index puntpoints_ledger_user_idx on public.puntpoints_ledger (user_id, created_at desc);

create trigger puntpoints_ledger_append_only
  before update or delete on public.puntpoints_ledger
  for each row execute function public.forbid_mutation();
create trigger puntpoints_ledger_no_truncate
  before truncate on public.puntpoints_ledger
  for each statement execute function public.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Rewards catalogue, voucher codes and redemptions
-- ---------------------------------------------------------------------------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{3,40}$'),
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 500),
  kind text not null check (kind in ('perk', 'sponsored', 'retail_voucher', 'betting_voucher')),
  points_cost integer not null check (points_cost > 0),
  -- For rewards without uploaded codes: null means unlimited.
  stock integer check (stock is null or stock >= 0),
  sponsor text,
  requires_approval boolean not null default true,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reward_codes (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards (id) on delete restrict,
  code text not null,
  redemption_id uuid unique,
  created_at timestamptz not null default now(),
  unique (reward_id, code)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  reward_id uuid not null references public.rewards (id) on delete restrict,
  points integer not null check (points > 0),
  status text not null default 'requested' check (status in ('requested', 'fulfilled', 'cancelled')),
  voucher_code text,
  note text,
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index redemptions_user_idx on public.redemptions (user_id, created_at desc);
create index redemptions_open_idx on public.redemptions (created_at) where status = 'requested';

alter table public.reward_codes
  add constraint reward_codes_redemption_fk foreign key (redemption_id) references public.redemptions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Referral vesting columns (the table already exists from the growth migration).
-- status: pending = waiting to vest, granted = points awarded, void = reversed or never earned.
-- ---------------------------------------------------------------------------
alter table public.referral_rewards
  add column vests_at timestamptz not null default (now() + interval '7 days'),
  add column vested_at timestamptz,
  add column reversed_at timestamptz;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reward_settings enable row level security;
alter table public.point_rules enable row level security;
alter table public.referral_milestones enable row level security;
alter table public.puntpoints_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_codes enable row level security;
alter table public.redemptions enable row level security;

-- Admin-managed configuration.
create policy reward_settings_admin_select on public.reward_settings for select to authenticated using (public.is_admin());
create policy reward_settings_admin_update on public.reward_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy point_rules_admin_select on public.point_rules for select to authenticated using (public.is_admin());
create policy point_rules_admin_update on public.point_rules for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy referral_milestones_admin_select on public.referral_milestones for select to authenticated using (public.is_admin());
create policy referral_milestones_admin_update on public.referral_milestones for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy rewards_admin_select on public.rewards for select to authenticated using (public.is_admin());
create policy rewards_admin_insert on public.rewards for insert to authenticated with check (public.is_admin());
create policy rewards_admin_update on public.rewards for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy reward_codes_admin_select on public.reward_codes for select to authenticated using (public.is_admin());
create policy reward_codes_admin_insert on public.reward_codes for insert to authenticated with check (public.is_admin());

-- Members read their own ledger and redemptions; admins read all. Nobody writes from a client.
create policy puntpoints_ledger_select on public.puntpoints_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy redemptions_select on public.redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke all on public.reward_settings, public.point_rules, public.referral_milestones, public.puntpoints_ledger,
  public.rewards, public.reward_codes, public.redemptions from anon, authenticated;
grant select on public.reward_settings, public.point_rules, public.referral_milestones, public.puntpoints_ledger,
  public.rewards, public.reward_codes, public.redemptions to authenticated;
grant update (enabled, updated_at, updated_by) on public.reward_settings to authenticated;
grant update (points, cap_per_day, cap_per_month, active, updated_at) on public.point_rules to authenticated;
grant update (title, bonus_points, active) on public.referral_milestones to authenticated;
grant insert on public.rewards to authenticated;
grant update (title, description, points_cost, stock, sponsor, requires_approval, active) on public.rewards to authenticated;
grant insert on public.reward_codes to authenticated;
grant all on public.reward_settings, public.point_rules, public.referral_milestones, public.puntpoints_ledger,
  public.rewards, public.reward_codes, public.redemptions to service_role;

-- ---------------------------------------------------------------------------
-- award_points: the only way points are earned. Nothing happens unless the master switch and the rule are on.
-- ---------------------------------------------------------------------------
create or replace function public.award_points(p_user uuid, p_rule text, p_ref text, p_points integer default null)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_rule public.point_rules;
  v_points integer;
  v_n integer;
  v_tz constant text := 'Africa/Johannesburg';
begin
  if not public.reward_setting('points_enabled') then
    return 0;
  end if;
  select * into v_rule from public.point_rules where code = p_rule and active;
  if not found then
    return 0;
  end if;

  -- Only members in good standing earn: 18+ attested, email confirmed, not banned, not on a break.
  if not exists (
    select 1 from public.profiles p
    where p.id = p_user and p.is_18_attested and not p.is_banned
      and (p.posting_paused_until is null or p.posting_paused_until <= now())
  ) or not public.can_post(p_user) then
    return 0;
  end if;

  if v_rule.cap_per_day is not null then
    select count(*) into v_n from public.puntpoints_ledger
    where user_id = p_user and rule_code = p_rule and kind = 'award'
      and (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date;
    if v_n >= v_rule.cap_per_day then return 0; end if;
  end if;
  if v_rule.cap_per_month is not null then
    select count(*) into v_n from public.puntpoints_ledger
    where user_id = p_user and rule_code = p_rule and kind = 'award'
      and date_trunc('month', created_at at time zone v_tz) = date_trunc('month', now() at time zone v_tz);
    if v_n >= v_rule.cap_per_month then return 0; end if;
  end if;

  v_points := coalesce(p_points, v_rule.points);
  if v_points <= 0 then return 0; end if;

  insert into public.puntpoints_ledger (user_id, kind, rule_code, points, ref_id)
  values (p_user, 'award', p_rule, v_points, p_ref)
  on conflict (user_id, rule_code, ref_id) where kind = 'award' do nothing;
  get diagnostics v_n = row_count;
  return case when v_n = 1 then v_points else 0 end;
end;
$$;

revoke all on function public.award_points(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.award_points(uuid, text, text, integer) to service_role;

-- Award hooks. They never block the action that triggered them.
create or replace function public.predictions_award_points()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform public.award_points(new.user_id, 'pick_locked', new.id::text);
    if (select count(*) from public.predictions where user_id = new.user_id) = 1 then
      perform public.award_points(new.user_id, 'first_pick', 'once');
    end if;
  exception when others then
    raise warning 'puntpoints award failed: %', sqlerrm;
  end;
  return new;
end;
$$;
create trigger z_predictions_award_points
  after insert on public.predictions
  for each row execute function public.predictions_award_points();

create or replace function public.settlement_award_points()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
begin
  if new.result in ('won', 'lost') then
    begin
      select user_id into v_user from public.predictions where id = new.prediction_id;
      perform public.award_points(v_user, 'pick_settled', new.prediction_id::text);
    exception when others then
      raise warning 'puntpoints award failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;
create trigger z_settlement_award_points
  after insert on public.settlement_events
  for each row execute function public.settlement_award_points();

-- The signed-in member asks for their one-off email-confirmation award. Safe to call any time: it is idempotent
-- and the database checks the confirmation itself.
create or replace function public.sync_my_points()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.award_points(auth.uid(), 'confirm_email', 'once');
$$;
revoke all on function public.sync_my_points() from public, anon;
grant execute on function public.sync_my_points() to authenticated, service_role;

create or replace function public.my_puntpoints()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(points), 0)::integer from public.puntpoints_ledger where user_id = auth.uid();
$$;
revoke all on function public.my_puntpoints() from public, anon;
grant execute on function public.my_puntpoints() to authenticated, service_role;

-- What the app may show: which parts are switched on, and the active earning rules.
create or replace function public.rewards_status()
returns table (points_enabled boolean, rewards_enabled boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.reward_setting('points_enabled'), public.reward_setting('rewards_enabled');
$$;
revoke all on function public.rewards_status() from public;
grant execute on function public.rewards_status() to anon, authenticated, service_role;

create or replace function public.point_rules_public()
returns table (code text, title text, points integer, cap_per_day integer, cap_per_month integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.code, r.title, r.points, r.cap_per_day, r.cap_per_month
  from public.point_rules r
  where r.active and public.reward_setting('points_enabled')
  order by r.sort;
$$;
revoke all on function public.point_rules_public() from public;
grant execute on function public.point_rules_public() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Referral vesting and clawback. Runs daily from pg_cron. Does nothing while points are switched off, so
-- referrals stay pending instead of being lost.
-- ---------------------------------------------------------------------------
create or replace function public.vest_referrals()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  r public.referral_rewards;
  m public.referral_milestones;
  v_count integer;
  v_done integer := 0;
begin
  if not public.reward_setting('points_enabled') then
    return 0;
  end if;

  -- Clawback: a referral that vested in the last 30 days is reversed if either account was banned or deleted.
  for r in
    select rr.* from public.referral_rewards rr
    where rr.status = 'granted' and rr.vested_at > now() - interval '30 days'
      and exists (
        select 1 from public.profiles p
        where p.id in (rr.referrer_id, rr.referred_id) and (p.is_banned or p.username::text like 'deleted-%')
      )
  loop
    insert into public.puntpoints_ledger (user_id, kind, rule_code, points, ref_id, reason)
    select l.user_id, 'reversal', l.rule_code, -l.points, l.ref_id, 'referral clawback'
    from public.puntpoints_ledger l
    where l.kind = 'award' and l.ref_id = r.id::text
      and l.rule_code in ('referral_referred', 'referral_referrer');
    update public.referral_rewards set status = 'void', reversed_at = now() where id = r.id;
  end loop;

  for r in
    select * from public.referral_rewards
    where status = 'pending' and vests_at <= now()
    order by created_at
  loop
    if exists (
      select 1 from public.profiles p
      where p.id in (r.referrer_id, r.referred_id) and (p.is_banned or p.username::text like 'deleted-%')
    ) then
      update public.referral_rewards set status = 'void', reversed_at = now() where id = r.id;
      continue;
    end if;

    perform public.award_points(r.referred_id, 'referral_referred', r.id::text);
    perform public.award_points(r.referrer_id, 'referral_referrer', r.id::text);
    update public.referral_rewards set status = 'granted', vested_at = now() where id = r.id;
    v_done := v_done + 1;

    select count(*) into v_count from public.referral_rewards where referrer_id = r.referrer_id and status = 'granted';
    for m in select * from public.referral_milestones where active and threshold <= v_count order by threshold loop
      perform public.award_points(r.referrer_id, 'referral_milestone', m.threshold::text, m.bonus_points);
    end loop;
  end loop;
  return v_done;
end;
$$;
revoke all on function public.vest_referrals() from public, anon, authenticated;
grant execute on function public.vest_referrals() to service_role;

select cron.schedule('vest-referrals', '15 3 * * *', $$select public.vest_referrals()$$);

-- The member's referral overview. Counts only; never who the friends are.
create or replace function public.my_referral_overview()
returns table (
  signed_up integer, qualified integer, pending integer, vested integer, reversed integer,
  next_threshold integer, next_title text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.profiles where referred_by = auth.uid()),
    (select count(*)::integer from public.referral_rewards where referrer_id = auth.uid()),
    (select count(*)::integer from public.referral_rewards where referrer_id = auth.uid() and status = 'pending'),
    (select count(*)::integer from public.referral_rewards where referrer_id = auth.uid() and status = 'granted'),
    (select count(*)::integer from public.referral_rewards where referrer_id = auth.uid() and status = 'void'),
    (select threshold from public.referral_milestones
      where active and threshold > (select count(*) from public.referral_rewards where referrer_id = auth.uid() and status = 'granted')
      order by threshold limit 1),
    (select title from public.referral_milestones
      where active and threshold > (select count(*) from public.referral_rewards where referrer_id = auth.uid() and status = 'granted')
      order by threshold limit 1);
$$;
revoke all on function public.my_referral_overview() from public, anon;
grant execute on function public.my_referral_overview() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The catalogue a member may see. Betting vouchers appear only when their own switch is on and only to members
-- who are eligible for a gambling promotion.
-- ---------------------------------------------------------------------------
create or replace function public.member_may_redeem(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.is_18_attested and not p.is_banned
      and (p.posting_paused_until is null or p.posting_paused_until <= now())
  ) and public.can_post(p_user);
$$;
revoke all on function public.member_may_redeem(uuid) from public, anon, authenticated;
grant execute on function public.member_may_redeem(uuid) to service_role;

create or replace function public.list_rewards()
returns table (
  id uuid, code text, title text, description text, kind text, points_cost integer, sponsor text, in_stock boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.id, r.code, r.title, r.description, r.kind, r.points_cost, r.sponsor,
    case
      when exists (select 1 from public.reward_codes c where c.reward_id = r.id)
        then exists (select 1 from public.reward_codes c where c.reward_id = r.id and c.redemption_id is null)
      else r.stock is null or r.stock > 0
    end
  from public.rewards r
  where auth.uid() is not null
    and public.reward_setting('rewards_enabled')
    and r.active
    and (r.kind <> 'betting_voucher'
         or (public.reward_setting('betting_vouchers_enabled') and public.member_may_redeem(auth.uid())))
  order by r.points_cost, r.title;
$$;
revoke all on function public.list_rewards() from public, anon;
grant execute on function public.list_rewards() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- redeem_reward: one transaction. Errors: not_authenticated, rewards_disabled, reward_not_found, not_eligible,
-- daily_limit, insufficient_points, out_of_stock.
-- ---------------------------------------------------------------------------
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

  -- Serialise this member's spending so two clicks cannot spend the same points twice.
  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));

  select * into v_r from public.rewards where id = p_reward and active for update;
  if not found or (v_r.kind = 'betting_voucher' and not public.reward_setting('betting_vouchers_enabled')) then
    raise exception 'reward_not_found' using errcode = 'P0001';
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

  -- Small perks can fulfil straight away; vouchers and anything flagged wait for an admin.
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

-- ---------------------------------------------------------------------------
-- Admin actions. Each checks is_admin() itself and writes new rows, never edits points.
-- ---------------------------------------------------------------------------
create or replace function public.admin_fulfil_redemption(p_redemption uuid, p_note text default null)
returns public.redemptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_red public.redemptions;
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_red from public.redemptions where id = p_redemption for update;
  if not found or v_red.status <> 'requested' then
    raise exception 'redemption_not_open' using errcode = 'P0001';
  end if;
  select code into v_code from public.reward_codes where redemption_id = v_red.id;
  update public.redemptions
  set status = 'fulfilled', voucher_code = v_code, note = nullif(btrim(coalesce(p_note, '')), ''),
      admin_id = auth.uid(), updated_at = now()
  where id = v_red.id
  returning * into v_red;
  return v_red;
end;
$$;
revoke all on function public.admin_fulfil_redemption(uuid, text) from public, anon;
grant execute on function public.admin_fulfil_redemption(uuid, text) to authenticated, service_role;

create or replace function public.admin_cancel_redemption(p_redemption uuid, p_reason text)
returns public.redemptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_red public.redemptions;
  v_has_code boolean;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_red from public.redemptions where id = p_redemption for update;
  if not found or v_red.status <> 'requested' then
    raise exception 'redemption_not_open' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_red.user_id::text));

  select exists (select 1 from public.reward_codes where redemption_id = v_red.id) into v_has_code;
  update public.reward_codes set redemption_id = null where redemption_id = v_red.id;
  if not v_has_code then
    update public.rewards set stock = stock + 1 where id = v_red.reward_id and stock is not null;
  end if;

  insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason, admin_id)
  values (v_red.user_id, 'refund', v_red.points, v_red.id::text, btrim(p_reason), auth.uid());

  update public.redemptions
  set status = 'cancelled', note = btrim(p_reason), admin_id = auth.uid(), updated_at = now()
  where id = v_red.id
  returning * into v_red;
  return v_red;
end;
$$;
revoke all on function public.admin_cancel_redemption(uuid, text) from public, anon;
grant execute on function public.admin_cancel_redemption(uuid, text) to authenticated, service_role;

create or replace function public.admin_adjust_points(p_user uuid, p_points integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_points is null or p_points = 0 then
    raise exception 'invalid_points' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('puntpoints:' || p_user::text));
  select coalesce(sum(points), 0) into v_balance from public.puntpoints_ledger where user_id = p_user;
  if v_balance + p_points < 0 then
    raise exception 'would_go_negative' using errcode = 'P0001';
  end if;
  insert into public.puntpoints_ledger (user_id, kind, points, reason, admin_id)
  values (p_user, 'adjust', p_points, btrim(p_reason), auth.uid());
  return v_balance + p_points;
end;
$$;
revoke all on function public.admin_adjust_points(uuid, integer, text) from public, anon;
grant execute on function public.admin_adjust_points(uuid, integer, text) to authenticated, service_role;

-- Review queue: recent referrals, with a flag when one member qualified several in a short time.
create or replace function public.admin_referral_review()
returns table (
  id uuid, referrer text, referred text, status text, created_at timestamptz, vests_at timestamptz, burst boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select rr.id, a.username::text, b.username::text, rr.status, rr.created_at, rr.vests_at,
    (select count(*) from public.referral_rewards x
      where x.referrer_id = rr.referrer_id and x.created_at between rr.created_at - interval '1 hour' and rr.created_at + interval '1 hour') >= 4
  from public.referral_rewards rr
  join public.profiles a on a.id = rr.referrer_id
  join public.profiles b on b.id = rr.referred_id
  order by rr.created_at desc
  limit 100;
end;
$$;
revoke all on function public.admin_referral_review() from public, anon;
grant execute on function public.admin_referral_review() to authenticated, service_role;

create or replace function public.admin_reverse_referral(p_referral uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.referral_rewards;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into r from public.referral_rewards where id = p_referral for update;
  if not found or r.status = 'void' then
    raise exception 'referral_not_found' using errcode = 'P0001';
  end if;
  insert into public.puntpoints_ledger (user_id, kind, rule_code, points, ref_id, reason, admin_id)
  select l.user_id, 'reversal', l.rule_code, -l.points, l.ref_id, btrim(p_reason), auth.uid()
  from public.puntpoints_ledger l
  where l.kind = 'award' and l.ref_id = r.id::text and l.rule_code in ('referral_referred', 'referral_referrer');
  update public.referral_rewards set status = 'void', reversed_at = now() where id = r.id;
end;
$$;
revoke all on function public.admin_reverse_referral(uuid, text) from public, anon;
grant execute on function public.admin_reverse_referral(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Legal copy changed with this feature: new notice versions for the Terms and the Privacy Policy.
-- ---------------------------------------------------------------------------
insert into public.notice_versions (kind, version, effective_at, url) values
  ('terms', '2026-10-29-r4', now(), '/terms'),
  ('privacy', '2026-10-29-r3', now(), '/privacy')
on conflict (kind, version) do nothing;
