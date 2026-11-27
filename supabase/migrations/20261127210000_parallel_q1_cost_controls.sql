-- Keep the paid editorial model within a deliberately small launch allowance.
-- The breaking slot may use one Medium draft per day; two daily claims leave one controlled retry/manual headroom.
insert into public.api_quota_limits (provider, daily_cap, monthly_cap, note)
values (
  'parallel-chat:medium',
  2,
  60,
  'Q1 2027 cost control: maximum 2 paid Medium calls/day and 60/month; scheduled usage is reserved for the breaking-news draft.'
)
on conflict (provider) do update
set daily_cap = excluded.daily_cap,
    monthly_cap = excluded.monthly_cap,
    note = excluded.note;

-- Daily aggregates alone do not identify which feature generated a request.
-- Record every successful quota claim with its caller so future spend can be attributed.
create table if not exists public.api_call_events (
  id bigint generated always as identity primary key,
  provider text not null,
  feature text not null default 'unattributed',
  claimed_at timestamptz not null default now()
);

create index if not exists api_call_events_claimed_at_idx
  on public.api_call_events (claimed_at desc);

create index if not exists api_call_events_provider_feature_idx
  on public.api_call_events (provider, feature, claimed_at desc);

alter table public.api_call_events enable row level security;
