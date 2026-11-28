-- Ads and affiliate creatives (owner request, 28 Nov 2026).
-- 1. affiliate_creatives: partner-approved promo copy per live affiliate, managed in Admin > Affiliates.
--    A creative can only be active once the partner's approval date is recorded (Hollywoodbets terms:
--    approved, unaltered creatives only).
-- 2. public_affiliate_creatives: public-safe projection of active creatives for live, licensed partners.
-- 3. affiliate_ad_events + record_ad_event(): anonymous, aggregate impression/click counts per creative and
--    placement. No user id, IP or device id is stored. The client only calls it after Affiliate tracking consent.
-- 4. affiliate_ad_stats(): admin-only 30-day performance summary for the Affiliates tab.
-- 5. is_ad_free(): Puntr Pro members (entitlement or account type) browse without ads.
-- 6. public_affiliate_partners gains slug (for logos and creative matching).

create table if not exists public.affiliate_creatives (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  format text not null default 'card' check (format in ('banner', 'card', 'text_link', 'overlay')),
  headline text not null check (length(headline) between 1 and 90),
  body text check (body is null or length(body) <= 220),
  cta_label text not null default 'Visit site' check (length(cta_label) between 1 and 32),
  image_url text check (image_url is null or image_url ~ '^https://'),
  tracking_link text check (tracking_link is null or tracking_link ~ '^https://'),
  terms_line text check (terms_line is null or length(terms_line) <= 160),
  placements text[] not null default '{}',
  weight integer not null default 1 check (weight between 1 and 10),
  active boolean not null default false,
  approved_at date,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_creative_active_needs_approval check (not active or approved_at is not null),
  constraint affiliate_creative_window check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists affiliate_creatives_partner_idx on public.affiliate_creatives (partner_id);

alter table public.affiliate_creatives enable row level security;

drop policy if exists affiliate_creatives_admin_select on public.affiliate_creatives;
create policy affiliate_creatives_admin_select on public.affiliate_creatives
  for select to authenticated using (public.is_admin());
drop policy if exists affiliate_creatives_admin_insert on public.affiliate_creatives;
create policy affiliate_creatives_admin_insert on public.affiliate_creatives
  for insert to authenticated with check (public.is_admin());
drop policy if exists affiliate_creatives_admin_update on public.affiliate_creatives;
create policy affiliate_creatives_admin_update on public.affiliate_creatives
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists affiliate_creatives_admin_delete on public.affiliate_creatives;
create policy affiliate_creatives_admin_delete on public.affiliate_creatives
  for delete to authenticated using (public.is_admin());

revoke all on public.affiliate_creatives from anon, authenticated;
grant select, insert, update, delete on public.affiliate_creatives to authenticated;
grant all on public.affiliate_creatives to service_role;

-- Public partner projection: append slug (create or replace may only add columns at the end).
create or replace view public.public_affiliate_partners
with (security_barrier = true)
as
select
  id,
  name,
  tracking_link,
  website_url,
  slug
from public.affiliate_partners
where category = 'bookmaker'
  and status = 'live'
  and tracking_link is not null
  and licence_checked_at is not null
  and terms_accepted_at is not null;

grant select on public.public_affiliate_partners to anon, authenticated;

create or replace view public.public_affiliate_creatives
with (security_barrier = true)
as
select
  c.id,
  c.partner_id,
  p.name as partner_name,
  p.slug as partner_slug,
  c.format,
  c.headline,
  c.body,
  c.cta_label,
  c.image_url,
  coalesce(c.tracking_link, p.tracking_link) as tracking_link,
  c.terms_line,
  c.placements,
  c.weight
from public.affiliate_creatives c
join public.affiliate_partners p on p.id = c.partner_id
where c.active
  and c.approved_at is not null
  and (c.starts_at is null or c.starts_at <= now())
  and (c.ends_at is null or c.ends_at > now())
  and p.category = 'bookmaker'
  and p.status = 'live'
  and p.tracking_link is not null
  and p.licence_checked_at is not null
  and p.terms_accepted_at is not null;

grant select on public.public_affiliate_creatives to anon, authenticated;

comment on view public.public_affiliate_creatives is
  'Public-safe projection of active, partner-approved creatives for live, licensed bookmaker affiliates.';

-- Aggregate ad events: no personal data by design.
create table if not exists public.affiliate_ad_events (
  id bigint generated always as identity primary key,
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  creative_id uuid references public.affiliate_creatives (id) on delete set null,
  placement text not null check (length(placement) between 1 and 40),
  kind text not null check (kind in ('impression', 'click', 'dismiss')),
  created_at timestamptz not null default now()
);

create index if not exists affiliate_ad_events_partner_time_idx
  on public.affiliate_ad_events (partner_id, created_at desc);

alter table public.affiliate_ad_events enable row level security;
drop policy if exists affiliate_ad_events_admin_select on public.affiliate_ad_events;
create policy affiliate_ad_events_admin_select on public.affiliate_ad_events
  for select to authenticated using (public.is_admin());
revoke all on public.affiliate_ad_events from anon, authenticated;
grant select on public.affiliate_ad_events to authenticated;
grant all on public.affiliate_ad_events to service_role;

create or replace function public.record_ad_event(
  p_partner uuid,
  p_creative uuid,
  p_placement text,
  p_kind text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('impression', 'click', 'dismiss') then return; end if;
  if p_placement is null or length(p_placement) not between 1 and 40
     or p_placement !~ '^[a-z0-9-]+$' then return; end if;
  if not exists (
    select 1 from public.affiliate_partners
    where id = p_partner and status = 'live' and category = 'bookmaker'
  ) then return; end if;
  if p_creative is not null and not exists (
    select 1 from public.affiliate_creatives where id = p_creative and partner_id = p_partner
  ) then
    p_creative := null;
  end if;
  insert into public.affiliate_ad_events (partner_id, creative_id, placement, kind)
  values (p_partner, p_creative, p_placement, p_kind);
  -- Keep at most 90 days (the retention stated on /privacy); pruned on roughly 1 in 200 writes.
  if random() < 0.005 then
    delete from public.affiliate_ad_events where created_at < now() - interval '90 days';
  end if;
end;
$$;

revoke all on function public.record_ad_event(uuid, uuid, text, text) from public;
grant execute on function public.record_ad_event(uuid, uuid, text, text) to anon, authenticated, service_role;

create or replace function public.affiliate_ad_stats(p_days integer default 30)
returns table (
  partner_id uuid,
  creative_id uuid,
  placement text,
  impressions bigint,
  clicks bigint,
  dismissals bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return query
  select e.partner_id, e.creative_id, e.placement,
         count(*) filter (where e.kind = 'impression'),
         count(*) filter (where e.kind = 'click'),
         count(*) filter (where e.kind = 'dismiss')
  from public.affiliate_ad_events e
  where e.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by e.partner_id, e.creative_id, e.placement;
end;
$$;

revoke all on function public.affiliate_ad_stats(integer) from public, anon;
grant execute on function public.affiliate_ad_stats(integer) to authenticated, service_role;

-- Ad-free browsing is a Puntr Pro entitlement.
create or replace function public.is_ad_free()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null and (
      public.has_entitlement(auth.uid(), 'pro')
      or exists (select 1 from public.profiles where id = auth.uid() and account_type = 'pro')
    ),
    false
  );
$$;

revoke all on function public.is_ad_free() from public, anon;
grant execute on function public.is_ad_free() to authenticated, service_role;

-- Draft creatives for the two live partners. Inactive until the owner pastes partner-approved copy and
-- records the approval date in Admin > Affiliates; until then the app shows its neutral default units.
insert into public.affiliate_creatives (partner_id, name, format, headline, body, cta_label, terms_line)
select p.id, d.name, d.format, d.headline, d.body, d.cta_label, '18+ only. T&Cs apply.'
from public.affiliate_partners p
join (values
  ('hollywoodbets', 'Hollywoodbets: default card (draft)', 'card',
   'Hollywoodbets', 'Sports betting from a South African bookmaker. Replace with the partner-approved copy.', 'Visit Hollywoodbets'),
  ('hollywoodbets', 'Hollywoodbets: interstitial (draft)', 'overlay',
   'Hollywoodbets', 'Replace with the partner-approved interstitial copy.', 'Visit Hollywoodbets'),
  ('1xbet', '1xBet: default card (draft)', 'card',
   '1xBet', 'Replace with the partner-approved copy.', 'Visit 1xBet'),
  ('1xbet', '1xBet: interstitial (draft)', 'overlay',
   '1xBet', 'Replace with the partner-approved interstitial copy.', 'Visit 1xBet')
) as d(slug, name, format, headline, body, cta_label) on d.slug = p.slug
where not exists (select 1 from public.affiliate_creatives c where c.partner_id = p.id);

-- Legal notices changed in the same PR: privacy (affiliate tracking row), tracking (/cookies: two session keys),
-- terms (Pro includes ad-free browsing). See docs/legal-changelog.md (28 Nov 2026, ads and affiliate creatives).
insert into public.notice_versions (kind, version, effective_at, url) values
  ('privacy', '2026-11-28-ads', now(), '/privacy'),
  ('tracking', '2026-11-28-r4', now(), '/cookies'),
  ('terms', '2026-11-28-r26', now(), '/terms')
on conflict (kind, version) do nothing;
