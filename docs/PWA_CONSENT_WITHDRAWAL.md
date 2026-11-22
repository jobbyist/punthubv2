# Push consent withdrawal cleanup

Migration: 20261122231000_push_consent_withdrawal_cleanup.sql

The account settings flow records push_notifications withdrawal through the existing record_consent RPC. An AFTER INSERT trigger on consent_records removes any remaining push_subscriptions for that user in the same database transaction as the withdrawal record.

The client also unsubscribes the current browser subscription and the authenticated API endpoint removes account-wide subscriptions. If the consent RPC fails after the API removal, push delivery is already stopped; the user is shown the consent-recording error so it can be retried.

Apply this migration after 20261122230000_pwa_push_notifications.sql and before enabling push notifications in production.