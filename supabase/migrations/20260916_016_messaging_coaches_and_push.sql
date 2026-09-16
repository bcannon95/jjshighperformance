-- ─────────────────────────────────────────────────────────────────────────────
-- Coach messaging + Web Push subscriptions
--
--   1. conversations.name column (optional, for named group chats)
--   2. get_my_trainer_id() — mirrors get_my_client_id() for trainer auth
--   3. Trainer RLS policies on conversations, conversation_participants, messages
--   4. push_subscriptions table (Web Push API) with RLS for both clients + trainers
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. NAMED GROUP CHATS ─────────────────────────────────────────────────────

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS name text;          -- null = auto-derive from participants


-- ── 2. TRAINER HELPER FUNCTION ───────────────────────────────────────────────
-- Mirrors get_my_client_id(). STABLE + SECURITY DEFINER keeps it safe and fast.

CREATE OR REPLACE FUNCTION get_my_trainer_id()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT id FROM trainers WHERE auth_user_id = auth.uid()
$$;


-- ── 3. TRAINER RLS POLICIES ──────────────────────────────────────────────────

-- conversations — SELECT (trainers see their own conversations)
DROP POLICY IF EXISTS "trainers view own conversations" ON conversations;
CREATE POLICY "trainers view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE  conversation_id = conversations.id
        AND  participant_id   = get_my_trainer_id()
        AND  participant_type = 'trainer'
    )
  );

-- conversation_participants — SELECT (see all participants in their conversations)
DROP POLICY IF EXISTS "trainers view conversation participants" ON conversation_participants;
CREATE POLICY "trainers view conversation participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE  cp.conversation_id = conversation_participants.conversation_id
        AND  cp.participant_id   = get_my_trainer_id()
        AND  cp.participant_type = 'trainer'
    )
  );

-- conversation_participants — UPDATE (stamp last_read_at on own row)
DROP POLICY IF EXISTS "trainers update own last read" ON conversation_participants;
CREATE POLICY "trainers update own last read"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (
    participant_id   = get_my_trainer_id()
    AND participant_type = 'trainer'
  )
  WITH CHECK (
    participant_id   = get_my_trainer_id()
    AND participant_type = 'trainer'
  );

-- messages — SELECT (read messages in conversations they participate in)
DROP POLICY IF EXISTS "trainers read messages in their conversations" ON messages;
CREATE POLICY "trainers read messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE  conversation_id = messages.conversation_id
        AND  participant_id   = get_my_trainer_id()
        AND  participant_type = 'trainer'
    )
  );

-- messages — INSERT (send messages as trainer)
DROP POLICY IF EXISTS "trainers send messages" ON messages;
CREATE POLICY "trainers send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id   = get_my_trainer_id()
    AND sender_type = 'trainer'
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE  conversation_id = messages.conversation_id
        AND  participant_id   = get_my_trainer_id()
        AND  participant_type = 'trainer'
    )
  );


-- ── 4. WEB PUSH SUBSCRIPTIONS ────────────────────────────────────────────────
-- Stores browser Web Push API subscriptions for both clients and trainers.
-- "auth_key" avoids collision with the postgres reserved word "auth".

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           bigserial PRIMARY KEY,
  user_id      bigint NOT NULL,
  user_type    text   NOT NULL DEFAULT 'client',  -- client | trainer
  endpoint     text   NOT NULL,
  p256dh       text   NOT NULL,
  auth_key     text   NOT NULL,
  push_enabled boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clients manage their own subscriptions
CREATE POLICY "clients manage own push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (
    user_id   = get_my_client_id()
    AND user_type = 'client'
  )
  WITH CHECK (
    user_id   = get_my_client_id()
    AND user_type = 'client'
  );

-- Trainers manage their own subscriptions
CREATE POLICY "trainers manage own push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (
    user_id   = get_my_trainer_id()
    AND user_type = 'trainer'
  )
  WITH CHECK (
    user_id   = get_my_trainer_id()
    AND user_type = 'trainer'
  );

-- Index for fast lookups when sending push notifications
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions(user_id, user_type)
  WHERE push_enabled = true;
