# /dev: the MVP readiness workspace

`puntr.co.za/dev` is available to signed-in Puntr administrators through the existing Supabase session. There is no separate email/password gate.

- The route calls `requireSupabaseAuth` and checks `public.is_admin()` on the server before returning readiness data.
- Every checklist write repeats the admin-role check; a signed-in non-admin cannot read the snapshot or update tasks.
- The admin dashboard links to `/dev` beside Founding HQ. The route remains noindex, private/no-store, excluded from the sitemap and public navigation.
- The page contains the live Readiness workspace, including the PR Draft Resolution Tracker for #185, #195 and post-launch #196. Each PR card shows its release lane, gate progress, cleared/open/deferred criteria and next action. The historical-results metric is read live from `completed_matches`; 2,500 is a minimum threshold and the UI shows when it has been exceeded. The legacy encrypted blueprint archive is no longer rendered here; its old standalone password flow has been retired.
- Checklist state is stored in `dev_readiness_state`; live metrics are read by `mvp-readiness.server.ts`.

## Access and operations

1. Sign in to Puntr with an administrator account (for example, the support admin account).
2. Open Admin and select **Dev workspace**, or visit `/dev` directly.
3. If the account is not an admin or the session is missing/expired, the page shows an access-denied message and links to `/join`.
4. Manual checklist ticks are validated against `TASK_IDS` and saved server-side.

Keep this route internal. Do not add it to public navigation, sitemap or indexable page metadata.
