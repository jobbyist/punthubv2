-- Terms r21 and Privacy r19 (15 Nov 2026): pre-match market reference odds and the "odds unverified" check on
-- member-entered odds (migration 20261115030000). Apply after the r21/r19 copy is live.
insert into public.notice_versions (kind, version, effective_at, url) values
  ('terms', '2026-11-15-r21', now(), '/terms'),
  ('privacy', '2026-11-15-r19', now(), '/privacy')
on conflict (kind, version) do nothing;
