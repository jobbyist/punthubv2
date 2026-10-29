-- P5: signed-in members keep their language choice on their profile.
-- Codes match src/locales/config.ts. The check lists every language the app can ever store; which ones are
-- offered in the switcher is decided by `enabled` in that file, not here, so enabling a reviewed language
-- needs no migration.

alter table public.profiles
  add column if not exists language text not null default 'en-ZA';

alter table public.profiles
  drop constraint if exists profiles_language_check;
alter table public.profiles
  add constraint profiles_language_check check (language in ('en-ZA', 'af', 'zu', 'xh'));

comment on column public.profiles.language is
  'UI language: en-ZA, af, zu or xh. Read first when resolving the language (profile, then cookie, then Accept-Language).';
