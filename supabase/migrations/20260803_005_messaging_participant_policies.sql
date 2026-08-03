-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging participant policy fixes
--
--   1. Broaden the SELECT policy on conversation_participants so clients can
--      see ALL participants in their conversations — not just their own row.
--      Required to fetch trainer names for the conversation header/thread list.
--
--   2. Add an UPDATE policy so clients can stamp their own last_read_at when
--      they open a conversation (drives the unread indicator).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. BROADEN SELECT POLICY ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "clients view own conversation participation" ON conversation_participants;

CREATE POLICY "clients view conversation participants"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    -- Allow seeing any participant row that belongs to a conversation
    -- the current client is themselves a participant of.
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE  cp.conversation_id = conversation_participants.conversation_id
        AND  cp.participant_id   = get_my_client_id()
        AND  cp.participant_type = 'client'
    )
  );


-- ── 2. UPDATE POLICY (last_read_at only) ─────────────────────────────────────

CREATE POLICY "clients update own last read"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (
    participant_id   = get_my_client_id()
    AND participant_type = 'client'
  )
  WITH CHECK (
    participant_id   = get_my_client_id()
    AND participant_type = 'client'
  );
