-- Terms r8 (referral rewards described as bonus PuntPoints, never cash) and Privacy r6 (email confirmed before sign-in).
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-06-r8', now(), '/terms'), ('privacy', '2026-11-06-r6', now(), '/privacy')
on conflict (kind, version) do nothing;
