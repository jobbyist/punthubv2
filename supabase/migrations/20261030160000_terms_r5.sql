-- Terms section 4 now says the service covers football at launch and that rugby and horse racing come after
-- launch. New sign-ups record acceptance against this version.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-10-29-r5', now(), '/terms')
on conflict (kind, version) do nothing;
