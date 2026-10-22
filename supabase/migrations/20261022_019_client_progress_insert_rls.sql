-- Allow authenticated clients to insert their own progress entries.
-- The existing SELECT-only policies were added in migration 012; these
-- complement them with INSERT so clients can log from within the app.

CREATE POLICY "clients insert own body weight logs"
  ON body_weight_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients insert own biometric logs"
  ON biometric_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients insert own body measurement logs"
  ON body_measurement_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
