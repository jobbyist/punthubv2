-- Record explicit push opt-in/out in the existing append-only consent ledger.
alter table public.consent_records drop constraint if exists consent_records_purpose_check;
alter table public.consent_records add constraint consent_records_purpose_check
  check (purpose = any (array['terms','privacy_notice','marketing_email','marketing_whatsapp','analytics','affiliate_tracking','push_notifications']::text[]));
alter table public.consent_records drop constraint if exists consent_records_source_check;
alter table public.consent_records add constraint consent_records_source_check
  check (source = any (array['join','banner','account']::text[]));

-- Web Push subscriptions and auditable admin push campaigns.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions (user_id, enabled);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

create table if not exists public.push_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 3 and 220),
  target_url text not null default '/predictions',
  audience text not null check (audience in ('all','founding','member','test')),
  status text not null default 'sending' check (status in ('sending','sent','partial','failed')),
  created_by uuid references public.profiles(id) on delete set null,
  attempted_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists push_campaigns_created_at_idx
  on public.push_notification_campaigns (created_at desc);
alter table public.push_notification_campaigns enable row level security;
revoke all on public.push_notification_campaigns from anon, authenticated;
grant all on public.push_notification_campaigns to service_role;

create table if not exists public.push_notification_deliveries (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.push_notification_campaigns(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('sent','failed','expired')),
  status_code integer,
  error text,
  sent_at timestamptz not null default now()
);
create index if not exists push_deliveries_campaign_idx
  on public.push_notification_deliveries (campaign_id, status);
create index if not exists push_deliveries_sent_at_idx
  on public.push_notification_deliveries (sent_at desc);
alter table public.push_notification_deliveries enable row level security;
revoke all on public.push_notification_deliveries from anon, authenticated;
grant all on public.push_notification_deliveries to service_role;
