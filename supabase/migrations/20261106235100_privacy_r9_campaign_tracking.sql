-- Privacy r9: Analytics row now names the campaign source and first-party storage (campaign_events).
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-06-r9', now(), '/privacy')
on conflict (kind, version) do nothing;
