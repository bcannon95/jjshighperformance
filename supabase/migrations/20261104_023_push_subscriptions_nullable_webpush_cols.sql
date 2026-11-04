-- p256dh and auth_key are Web Push (VAPID) fields only.
-- APNs subscriptions (iOS native) don't have these values, so they must be nullable.

ALTER TABLE push_subscriptions
  ALTER COLUMN p256dh   DROP NOT NULL,
  ALTER COLUMN auth_key DROP NOT NULL;
