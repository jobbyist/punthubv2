-- 13 Nov 2026 (owner): the scheduled newsroom article is published even when it fails the quality checks, and the
-- owner is emailed at admin@puntr.co.za to review (and unpublish/regenerate if needed). Manual runs keep the checks.
alter table public.content_settings add column if not exists publish_on_schedule boolean not null default false;
update public.content_settings set publish_on_schedule = true, updated_at = now() where id = true;
