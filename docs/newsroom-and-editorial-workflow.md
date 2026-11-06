# Newsroom and editorial workflow

- Table `newsroom_articles` (statuses DRAFT, REVIEW, SCHEDULED, PUBLISHED, ARCHIVED). RLS: the public sees only
  PUBLISHED rows whose `published_at` has passed; admins can do everything. Drafts never appear on `/newsroom`, the
  homepage section "LATEST FROM PUNTR" or in the sitemap.
- Routes: `/newsroom` (category filter via `?category=`), `/newsroom/$slug`. Body is plain text, blank line = new
  paragraph (never rendered as HTML).
- Publishing (set `status = 'PUBLISHED'`, or `SCHEDULED` with a future `published_at`; pg_cron job
  `newsroom-publish-due` flips due items every 5 minutes) creates exactly one in-app notification through the
  `newsroom_after_publish` trigger (`notifications.newsroom_article_id` is unique, so retries never duplicate it).
- Until the admin editor exists, articles are created in the Supabase table editor or with SQL. No placeholder
  articles are shipped; the homepage section stays hidden until the first real article is published.
- Not built yet: admin editor UI, cover image upload, email digest of published articles (see Resend sequences).
