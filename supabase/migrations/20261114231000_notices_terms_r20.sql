-- Terms r20 (14 Nov 2026): the Founding Annual Pass states its AI fair-use limit (40 a month, 15 a day), matching
-- app_settings.pro_cap_annual_pass. Apply after the r20 copy is live.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-11-14-r20', now(), '/terms')
on conflict (kind, version) do nothing;
