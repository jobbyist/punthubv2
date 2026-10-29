-- P10: growth mechanics. Referral rewards (recorded now, granted when credits launch), the founding counter,
-- and the logs the waitlist invite script needs. RLS is on for every table.

-- ---------------------------------------------------------------------------
-- founding_spots_taken: public, so the counter works for signed-out visitors. Deleted accounts keep their
-- number (the record is permanent), so the count only ever goes up.
-- ---------------------------------------------------------------------------
create or replace function public.founding_spots_taken()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.profiles where founding_number is not null;
$$;

revoke all on function public.founding_spots_taken() from public;
grant execute on function public.founding_spots_taken() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- referral_rewards: one row per referred member, created only when that member posts their first pick.
-- Pending until credits launch; nothing is paid or granted by this table.
-- ---------------------------------------------------------------------------
create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete restrict,
  referred_id uuid not null unique references public.profiles (id) on delete restrict,
  qualifying_prediction_id uuid not null references public.predictions (id) on delete restrict,
  referrer_credits integer not null default 15 check (referrer_credits >= 0),
  referred_credits integer not null default 15 check (referred_credits >= 0),
  status text not null default 'pending' check (status in ('pending', 'granted', 'void')),
  created_at timestamptz not null default now(),
  constraint referral_not_self check (referrer_id <> referred_id)
);

create index referral_rewards_referrer_idx on public.referral_rewards (referrer_id);

alter table public.referral_rewards enable row level security;

create policy referral_rewards_select_own_or_admin on public.referral_rewards
  for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

revoke all on public.referral_rewards from anon, authenticated;
grant select on public.referral_rewards to authenticated;
grant all on public.referral_rewards to service_role;

create or replace function public.predictions_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer uuid;
begin
  select referred_by into v_referrer from public.profiles where id = new.user_id;
  if v_referrer is not null
     and (select count(*) from public.predictions where user_id = new.user_id) = 1 then
    insert into public.referral_rewards (referrer_id, referred_id, qualifying_prediction_id)
    values (v_referrer, new.user_id, new.id)
    on conflict (referred_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger predictions_referral_reward
  after insert on public.predictions
  for each row execute function public.predictions_referral_reward();

-- Counts for the signed-in member. "joined" means the friend has posted a first pick; "signed_up" counts everyone
-- who used the link. Returns nothing about who they are.
create or replace function public.my_referral_counts()
returns table (signed_up integer, joined integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::integer from public.profiles where referred_by = auth.uid()),
    (select count(*)::integer from public.referral_rewards where referrer_id = auth.uid());
$$;

revoke all on function public.my_referral_counts() from public, anon;
grant execute on function public.my_referral_counts() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Waitlist invite log and unsubscribes. Written by the invite script and the unsubscribe route (service role).
-- Admins can read both in /admin (P11).
-- ---------------------------------------------------------------------------
create table public.waitlist_invites (
  email text primary key check (email = lower(email)),
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  detail text
);

create table public.waitlist_unsubscribes (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.waitlist_invites enable row level security;
alter table public.waitlist_unsubscribes enable row level security;

create policy waitlist_invites_admin_select on public.waitlist_invites
  for select to authenticated using (public.is_admin());
create policy waitlist_unsubscribes_admin_select on public.waitlist_unsubscribes
  for select to authenticated using (public.is_admin());

revoke all on public.waitlist_invites, public.waitlist_unsubscribes from anon, authenticated;
grant select on public.waitlist_invites, public.waitlist_unsubscribes to authenticated;
grant all on public.waitlist_invites, public.waitlist_unsubscribes to service_role;
