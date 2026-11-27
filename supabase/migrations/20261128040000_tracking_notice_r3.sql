-- Privacy choices (/cookies) r3: lists three new essential, on-device browser storage keys
-- (puntr:context:v1 for context-aware Discover and homepage, puntr:has-account for the sign-in form,
-- puntr:search:recent for recent searches). No data leaves the browser. See docs/legal-changelog.md (28 Nov 2026).
insert into public.notice_versions (kind, version, effective_at, url) values
  ('tracking', '2026-11-28-r3', now(), '/cookies')
on conflict (kind, version) do nothing;
