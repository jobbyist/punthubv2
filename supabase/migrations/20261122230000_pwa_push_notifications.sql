-- Record explicit push opt-in/out in the existing append-only consent ledger.
alter table public.consent_records drop constraint if exists consent_records_purpose_check;
alter table public.consent_records add constraint consent_records_purpose_check
  check (purpose = any (array['terms','privacy_notice','marketing_email','marketing_whatsapp','analytics','affiliate_tracking','push_notifications']::text[]));
alter table public.consent_records drop constraint if exists consent_records_source_check;
alter table public.consent_records add constraint consent_records_source_check
  check (source = any (array['join','banner','account','pwa_prompt']::text[]));

-- Web Push subscriptions and auditable admin push campaigns.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
gra¶»§q«^