-- Admin > Translations (owner, 14 Nov 2026): native-speaker review of each translated string, then a language
-- sign-off. Translations themselves live in the repo (src/locales/<code>/*.json and the translated legal pages);
-- these tables hold the reviewer's decisions, suggested wording and notes. Approved suggestions are copied into
-- the repo before a language is switched on, so nothing here changes the live site by itself.
--
-- Admin-only: RLS on, no policies for anon/authenticated. All reads and writes go through server functions
-- that re-check is_admin() and log to admin_actions (src/lib/translations-admin.functions.ts).
-- No personal data beyond the reviewer's admin id and the name they sign with.

create table if not exists public.translation_reviews (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('af', 'zu')),
  namespace text not null check (namespace ~ '^[a-z][a-z0-9-]{0,40}$'),
  key text not null check (char_length(key) between 1 and 200),
  -- English and translated text as the reviewer saw them, so a later change to either shows up as stale.
  source_text text not null check (char_length(source_text) <= 20000),
  reviewed_text text not null check (char_length(reviewed_text) <= 20000),
  status text not null check (status in ('approved', 'changes')),
  suggestion text check (suggestion is null or char_length(suggestion) <= 20000),
  note text check (note is null or char_length(note) <= 2000),
  reviewer_id uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  unique (locale, namespace, key)
);

create index if not exists translation_reviews_locale_ns_idx
  on public.translation_reviews (locale, namespace);

create table if not exists public.translation_signoffs (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('af', 'zu')),
  decision text not null check (decision in ('approved', 'withdrawn')),
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 120),
  note text check (note is null or char_length(note) <= 2000),
  approved_count integer not null default 0,
  total_count integer not null default 0,
  signed_by uuid references auth.users (id) on delete set null,
  signed_at timestamptz not null default now()
);

alter table public.translation_reviews enable row level security;
alter table public.translation_signoffs enable row level security;

revoke all on public.translation_reviews, public.translation_signoffs from anon, authenticated;
grant select, insert, update, delete on public.translation_reviews to service_role;
-- Sign-offs are a record: insert and read only, never edited or deleted.
grant select, insert on public.translation_signoffs to service_role;
