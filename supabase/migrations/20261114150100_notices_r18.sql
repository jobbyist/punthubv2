-- Privacy and Terms r18 (betting slips). Applied after the r18 legal copy is deployed, so members are never
-- asked to accept text they cannot yet read.
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-14-r18', now(), '/privacy'), ('terms', '2026-11-14-r18', now(), '/terms')
on conflict (kind, version) do nothing;
