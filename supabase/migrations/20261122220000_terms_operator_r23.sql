-- 22 Nov 2026: Terms r23 corrects the limitation-of-liability clause to name the registered operator.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-22-r23', now(), '/terms')
on conflict (kind, version) do nothing;
