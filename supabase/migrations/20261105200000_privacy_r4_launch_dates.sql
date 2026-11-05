-- Privacy section 4 now says the early-access emails start when Founding Member sign-ups open (2 Nov 2026), not on
-- launch day. The official platform launch is 1 Dec 2026. New sign-ups record acceptance against this version.
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-05-r4', now(), '/privacy')
on conflict (kind, version) do nothing;
