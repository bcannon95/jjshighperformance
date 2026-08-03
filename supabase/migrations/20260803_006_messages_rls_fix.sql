-- ─────────────────────────────────────────────────────────────────────────────
-- Fix messages RLS: use a SECURITY DEFINER wrapper so the conversation-
-- participation check bypasses conversation_participants RLS.
--
-- Without this, the messages SELECT policy runs an EXISTS against
-- conversation_participants as the authenticated role, which hits that
-- table's own RLS. Depending on policy evaluation order this can return
-- zero rows even when the user is a valid participant.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_my_conversation(conv_id bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE  conversation_id = conv_id
      AND  participant_id   = get_my_client_id()
      AND  participant_type = 'client'
  )
$$;

-- Re-create the messages SELECT policy using the SECURITY DEFINER function
DROP POLICY IF EXISTS "clients read messages in their conversations" ON messages;

CREATE POLICY "clients read messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (is_my_conversation(conversation_id));
