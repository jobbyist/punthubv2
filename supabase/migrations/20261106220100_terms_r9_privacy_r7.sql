-- Terms r9 (Annual Pass claim includes payment) and Privacy r7 (payment references, profile pictures, PayFast).
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-06-r9', now(), '/terms'), ('privacy', '2026-11-06-r7', now(), '/privacy')
on conflict (kind, version) do nothing;
