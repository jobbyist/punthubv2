-- Public, minimal projection for approved live bookmaker affiliate placements.
-- Internal contact, commission, licence notes and event history remain admin-only.
create or replace view public.public_affiliate_partners
with (security_barrier = true)
as
select
  id,
  name,
  tracking_link,
  website_url
from public.affiliate_partners
where category = 'bookmaker'
  and status = 'live'
  and tracking_link is not null
  and licence_checked_at is not null
  and terms_accepted_at is not null;

grant select on public.public_affiliate_partners to anon, authenticated;

comment on view public.public_affiliate_partners is
  'Public-safe projection of live, licensed bookmaker affiliate partners.';

-- Activate only the two partners with stored tracking links and completed licence/terms checks.
with activated as (
  update public.affiliate_partners
  set status = 'live',
      went_live_at = coalesce(went_live_at, current_date)
  where slug in ('hollywoodbets', '1xbet')
    and status = 'approved'
    and tracking_link is not null
    and licence_checked_at is not null
    and terms_accepted_at is not null
  returning id, name
)
insert into public.affiliate_partner_events (partner_id, kind, body)
select
  id,
  'status',
  'Affiliate placement activated for Puntr MVP; tracking link and licence/terms checks were present.'
from activated;
