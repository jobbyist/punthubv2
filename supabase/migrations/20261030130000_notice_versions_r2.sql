-- The Terms, Privacy Policy and Privacy choices pages were rewritten to match the platform as built (sign-in
-- methods, two-factor, early-access launch messages, the public record and corrections, invites, paid options
-- not yet on sale). New sign-ups record acceptance against these versions. Earlier consent rows keep the
-- version they were given. Attorney review of this text follows retroactively (see docs/legal-changelog.md).
insert into public.notice_versions (kind, version, effective_at, url) values
  ('terms', '2026-10-29-r2', now(), '/terms'),
  ('privacy', '2026-10-29-r2', now(), '/privacy'),
  ('marketing', '2026-10-29-r2', now(), '/privacy#marketing'),
  ('tracking', '2026-10-29-r2', now(), '/cookies')
on conflict (kind, version) do nothing;
