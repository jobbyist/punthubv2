# In-app notifications

- `notifications` (one row per update) and `user_notifications` (read state, unique per member and notification).
  Members read published notifications and only their own read rows (RLS). Admins write notifications.
- The bell (`src/components/notification-bell.tsx`, `src/hooks/use-notifications.ts`) subscribes to INSERTs on
  `notifications` through Supabase Realtime (table added to the `supabase_realtime` publication) and falls back to a
  refresh when the dropdown opens.
- Newsroom publication creates its notification automatically. Campaign announcements are plain inserts into
  `notifications` (title, message, category, target_url).
