-- Fix infinite recursion in conversation_participants RLS policies.
-- The old SELECT policies queried conversation_participants from within
-- a conversation_participants policy, causing infinite recursion → 500.
-- Fix: SECURITY DEFINER functions bypass RLS and break the cycle.

-- ── Security-definer helpers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_trainer_conversation_ids()
RETURNS SETOF bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id
  FROM conversation_participants
  WHERE participant_id = get_my_trainer_id()
    AND participant_type = 'trainer'
$$;

CREATE OR REPLACE FUNCTION get_my_client_conversation_ids()
RETURNS SETOF bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT conversation_id
  FROM conversation_participants
  WHERE participant_id = get_my_client_id()
    AND participant_type = 'client'
$$;

-- ── Fix conversation_participants policies ─────────────────────────────────

DROP POLICY IF EXISTS "clients view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "trainers view conversation participants" ON conversation_participants;

CREATE POLICY "clients view conversation participants" ON conversation_participants
  FOR SELECT
  USING (conversation_id IN (SELECT get_my_client_conversation_ids()));

CREATE POLICY "trainers view conversation participants" ON conversation_participants
  FOR SELECT
  USING (conversation_id IN (SELECT get_my_trainer_conversation_ids()));

-- ── Fix conversations policies (also used the now-broken sub-policies) ─────

DROP POLICY IF EXISTS "clients view own conversations" ON conversations;
DROP POLICY IF EXISTS "trainers view own conversations" ON conversations;

CREATE POLICY "clients view own conversations" ON conversations
  FOR SELECT
  USING (id IN (SELECT get_my_client_conversation_ids()));

CREATE POLICY "trainers view own conversations" ON conversations
  FOR SELECT
  USING (id IN (SELECT get_my_trainer_conversation_ids()));
