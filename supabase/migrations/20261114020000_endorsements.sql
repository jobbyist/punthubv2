-- Admin > Endorsements: organisations Puntr is seeking an endorsement or recognition from, their status, the reasons,
-- and the outreach / follow-up emails drafted (Gemini) and sent (Resend). Admin only: RLS on, no policies, service-role
-- access through admin-checked server functions. No member data is stored here.
create table if not exists public.endorsement_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 120),
  kind text not null default 'other'
    check (kind in ('regulator', 'foundation', 'industry_body', 'partner', 'media', 'other')),
  jurisdiction text not null default '' check (char_length(jurisdiction) <= 120),
  website text check (website is null or website ~ '^https://'),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_role text not null default '' check (char_length(contact_role) <= 120),
  contact_email text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'prospect'
    check (status in ('prospect', 'drafted', 'contacted', 'follow_up_due', 'in_discussion', 'endorsed', 'declined', 'no_response', 'paused')),
  what_we_seek text not null default '' check (char_length(what_we_seek) <= 600),
  reasons text not null default '' check (char_length(reasons) <= 1500),
  notes text not null default '' check (char_length(notes) <= 3000),
  do_not_contact boolean not null default false,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.endorsement_emails (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.endorsement_orgs(id) on delete cascade,
  kind text not null check (kind in ('outreach', 'follow_up')),
  sender text not null check (sender in ('michael', 'partners')),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 6000),
  status text not null default 'draft' check (status in ('draft', 'sent', 'failed')),
  model text,
  to_email text,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists endorsement_emails_org_idx on public.endorsement_emails (org_id, created_at desc);

create table if not exists public.endorsement_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.endorsement_orgs(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  kind text not null,
  detail text not null default '' check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists endorsement_events_org_idx on public.endorsement_events (org_id, created_at desc);

alter table public.endorsement_orgs enable row level security;
alter table public.endorsement_emails enable row level security;
alter table public.endorsement_events enable row level security;
revoke all on public.endorsement_orgs, public.endorsement_emails, public.endorsement_events from anon, authenticated;
grant select, insert, update, delete on public.endorsement_orgs, public.endorsement_emails, public.endorsement_events to service_role;

create or replace function public.endorsement_orgs_touch() returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists endorsement_orgs_touch on public.endorsement_orgs;
create trigger endorsement_orgs_touch before update on public.endorsement_orgs
  for each row execute function public.endorsement_orgs_touch();

insert into public.endorsement_orgs (name, kind, jurisdiction, website, what_we_seek, reasons) values
  ('Western Cape Gambling and Racing Board', 'regulator', 'Western Cape', 'https://www.wcgrb.co.za',
   'Guidance on how a prediction platform that is not a bookmaker should present gambling-adjacent content; recognition if appropriate.',
   'Puntr is a free sports prediction community, 18+ only, with the national helpline on every page and no betting, odds comparison or cash prizes at launch.'),
  ('National Lotteries Commission', 'regulator', 'National', 'https://www.nlcsa.org.za',
   'Confirmation that Puntr''s free-to-enter promotions and non-cash rewards are presented appropriately.',
   'Puntr runs free-to-enter promotions with published rules and vouchers only, never cash.'),
  ('Gauteng Gambling Board', 'regulator', 'Gauteng', 'https://www.ggb.org.za',
   'Guidance for a Gauteng-based audience and any future licensed-partner content.',
   'Puntr serves members across South Africa, including Gauteng; it will only feature licensed operators after a recorded licence check.'),
  ('South African Responsible Gambling Foundation', 'foundation', 'National', 'https://www.responsiblegambling.org.za',
   'Review of Puntr''s responsible-gambling messaging and a possible partnership.',
   'Responsible-gambling notice and the 0800 006 008 helpline appear on every page; Puntr offers break tools and 18+ attestation.'),
  ('National Gambling Board of South Africa', 'regulator', 'National', 'https://www.ngb.org.za',
   'Guidance on national norms and standards relevant to a prediction community.',
   'Puntr wants to be transparent with the national regulator before launch on 1 December 2026.')
on conflict (name) do nothing;
