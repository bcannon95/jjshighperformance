-- ─────────────────────────────────────────────────────────────────────────────
-- RLS for Trainerize mirror tables used by the client app.
-- Without these policies all authenticated users can read any client's data.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE calendar_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs            ENABLE ROW LEVEL SECURITY;

-- calendar_events: clients manage their own events only
CREATE POLICY "clients view own calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients insert own calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients update own calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients delete own calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- body_weight_logs: clients read their own only (Trainerize owns writes)
CREATE POLICY "clients view own body weight logs"
  ON body_weight_logs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- biometric_logs: clients read their own only
CREATE POLICY "clients view own biometric logs"
  ON biometric_logs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- body_measurement_logs: clients read their own only
CREATE POLICY "clients view own body measurement logs"
  ON body_measurement_logs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- sleep_logs: clients read their own only
CREATE POLICY "clients view own sleep logs"
  ON sleep_logs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
