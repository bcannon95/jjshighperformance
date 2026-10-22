-- Add APNs support to push_subscriptions.
-- The existing columns (endpoint, p256dh, auth_key) are for Web Push (VAPID).
-- apns_token stores the iOS device token from APNs for Capacitor builds.
-- platform distinguishes between the two.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS apns_token TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';

-- Allow clients to upsert their own APNs token (INSERT already allowed from migration 019 via RLS,
-- but push_subscriptions uses its own RLS). Add UPDATE so tokens can be refreshed.
CREATE POLICY "clients update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    AND user_type = 'client'
  );
