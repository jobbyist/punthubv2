-- Terms r7 (Founding Annual Pass offer, athletics and referral plans) and Privacy r5 (welcome email and pass claims).
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-06-r7', now(), '/terms'), ('privacy', '2026-11-06-r5', now(), '/privacy')
on conflict (kind, version) do nothing;
