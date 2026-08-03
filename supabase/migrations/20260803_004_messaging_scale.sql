-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging at scale — three concerns addressed:
--
--   1. Helper function  get_my_client_id()
--      Resolves auth.uid() → clients.id once per query (STABLE + SECURITY
--      DEFINER), replacing the per-row correlated subquery used in all RLS
--      policies. Benefits every table, not just messaging.
--
--   2. Indexes
--      conversation_participants needs indexes so RLS EXISTS checks and
--      conversation-list queries use index scans instead of seq scans.
--
--   3. Denormalised last-message columns on conversations
--      Avoids a GROUP BY / DISTINCT ON across the full messages table every
--      time the thread list is rendered. A trigger keeps them in sync.
--
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. HELPER FUNCTION ───────────────────────────────────────────────────────
-- STABLE  → result can be reused across rows in the same query.
-- SECURITY DEFINER + explicit search_path → safe from search-path hijacking.

CREATE OR REPLACE FUNCTION get_my_client_id()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()
$$;


-- ── 2. INDEXES ───────────────────────────────────────────────────────────────

-- Fast lookup of all conversations a participant belongs to (RLS + thread list)
CREATE INDEX IF NOT EXISTS conversation_participants_participant_idx
  ON conversation_participants(participant_id, participant_type);

-- Fast EXISTS check when evaluating RLS on conversations / messages
CREATE INDEX IF NOT EXISTS conversation_participants_conversation_participant_idx
  ON conversation_participants(conversation_id, participant_id, participant_type);

-- Thread list sort order (most recently active first)
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
  ON conversations(last_message_at DESC NULLS LAST);


-- ── 3. DENORMALISED LAST-MESSAGE COLUMNS ─────────────────────────────────────

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text;         -- truncated to 120 chars

-- Trigger function: fires after INSERT / UPDATE / DELETE on messages.
-- On DELETE it recalculates from the next most-recent row; on INSERT/UPDATE
-- it just stamps the new values directly (no extra query needed).

CREATE OR REPLACE FUNCTION fn_update_conversation_last_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE conversations
    SET
      last_message_at      = (
        SELECT sent_at FROM messages
        WHERE  conversation_id = OLD.conversation_id
        ORDER  BY sent_at DESC
        LIMIT  1
      ),
      last_message_preview = (
        SELECT left(body, 120) FROM messages
        WHERE  conversation_id = OLD.conversation_id
        ORDER  BY sent_at DESC
        LIMIT  1
      )
    WHERE id = OLD.conversation_id;
  ELSE
    -- INSERT or UPDATE
    UPDATE conversations
    SET
      last_message_at      = NEW.sent_at,
      last_message_preview = left(NEW.body, 120)
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_update_conversation ON messages;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_update_conversation_last_message();

-- Backfill any existing messages
UPDATE conversations c
SET
  last_message_at      = latest.sent_at,
  last_message_preview = left(latest.body, 120)
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id, sent_at, body
  FROM messages
  ORDER BY conversation_id, sent_at DESC
) latest
WHERE c.id = latest.conversation_id;


-- ── 4. OPTIMISED RLS POLICIES ────────────────────────────────────────────────
-- Drop the originals from 20260625_002_app_tables.sql and replace them with
-- versions that call get_my_client_id() instead of joining through clients.
-- The function call is resolved once; the result is used in an index scan on
-- conversation_participants rather than a nested-loop join per row.

-- conversations
DROP POLICY IF EXISTS "clients view own conversations" ON conversations;
CREATE POLICY "clients view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE  conversation_id = conversations.id
        AND  participant_id   = get_my_client_id()
        AND  participant_type = 'client'
    )
  );

-- conversation_participants
DROP POLICY IF EXISTS "clients view own conversation participation" ON conversation_participants;
CREATE POLICY "clients view own conversation participation"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    participant_id   = get_my_client_id()
    AND participant_type = 'client'
  );

-- messages — read
DROP POLICY IF EXISTS "clients read messages in their conversations" ON messages;
CREATE POLICY "clients read messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE  conversation_id = messages.conversation_id
        AND  participant_id   = get_my_client_id()
        AND  participant_type = 'client'
    )
  );

-- messages — send
DROP POLICY IF EXISTS "clients send messages" ON messages;
CREATE POLICY "clients send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id   = get_my_client_id()
    AND sender_type = 'client'
  );


-- ── 5. APPLY SAME HELPER TO OTHER APP-NATIVE RLS POLICIES ───────────────────
-- lesson_progress, run_sessions, push_tokens, and client_badges have the same
-- per-row subquery pattern. Fix them here for consistency.

-- lesson_progress
DROP POLICY IF EXISTS "clients manage own lesson progress" ON lesson_progress;
CREATE POLICY "clients manage own lesson progress"
  ON lesson_progress FOR ALL
  TO authenticated
  USING     (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());

-- run_sessions
DROP POLICY IF EXISTS "clients manage own run sessions" ON run_sessions;
CREATE POLICY "clients manage own run sessions"
  ON run_sessions FOR ALL
  TO authenticated
  USING     (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());

-- push_tokens
DROP POLICY IF EXISTS "clients manage own push tokens" ON push_tokens;
CREATE POLICY "clients manage own push tokens"
  ON push_tokens FOR ALL
  TO authenticated
  USING     (client_id = get_my_client_id())
  WITH CHECK (client_id = get_my_client_id());

-- client_badges
DROP POLICY IF EXISTS "clients view own badges" ON client_badges;
CREATE POLICY "clients view own badges"
  ON client_badges FOR SELECT
  TO authenticated
  USING (client_id = get_my_client_id());
