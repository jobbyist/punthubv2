-- 23 Nov 2026: Terms r24 and Privacy r22 disclose PayFast by Network payment processing,
-- planned Ozow status, and the Brand Ambassador application data flow.
insert into public.notice_versions (kind, version, effective_at, url) values
  ('terms', '2026-11-23-r24', now(), '/terms'),
  ('privacy', '2026-11-23-r22', now(), '/privacy')
on conflict (kind, version) do nothing;
