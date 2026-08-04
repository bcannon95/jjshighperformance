-- ─────────────────────────────────────────────────────────────────────────────
-- session_credits: enable RLS so clients can only see their own rows.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE session_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients view own session credits"
  ON session_credits FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
