# Admin and /verify

## Becoming an admin

Roles cannot be changed from the app (`profiles_guard` blocks it). Sign up as a normal member first, then run this once in the Supabase SQL editor, replacing the username:

```sql
update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
```

Not run for you. The service role (the SQL editor) is the only thing allowed to do it.

## /admin (noindex)

- **Fixtures**: re-sync fixtures and results now (uses the provider's daily quota), and the CSV fallback import.
- **Settlement**: final matches with picks still waiting, "Settle all now" (the same run as the cron), and corrections. A correction calls `admin_settle_prediction`, needs a reason, and is written as a new `settlement_events` row (source `admin`, with your id). Earlier rows are never changed.
- **Reports**: open reports; resolve, or hide the pick with a reason (`hidden_predictions`). Hidden picks leave public views but stay in the chain and in `/verify`.
- **Users**: search by username, ban or unban (server function, service role, you cannot ban yourself or another admin), hide a pick by ID.
- **Waitlist**: `early_access` with invited and unsubscribed status. Invites are sent by `scripts/invite-waitlist.ts`, never from here.

Every action is checked twice: RLS or `is_admin()` in the database, and `is_admin()` again in each server function.

## /verify

Paste a pick ID. The browser recomputes the SHA-256 from the stored fields and the previous pick's hash and compares it with the stored hash (`src/lib/verify.ts`, tested against a hash produced by Postgres). It also checks the link to the previous pick. A daily table of chain heads is written by the `chain-head` cron (`write_chain_head`, 21:55 UTC).

## Open

- `20261030100500_chain_head_fix.sql` fixes an ambiguous-column bug in `write_chain_head` from `20261030100000_admin_chain.sql`. Apply it, then re-run `supabase/tests/admin_chain.sql`.
