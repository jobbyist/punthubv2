-- Terms section 4 now lists the sports planned after launch (basketball, rugby, horse racing, combat sports,
-- cricket, tennis), says they are not available until they appear on the site, and that /roadmap dates are
-- plans, not commitments. New sign-ups record acceptance against this version.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-10-30-r6', now(), '/terms')
on conflict (kind, version) do nothing;
