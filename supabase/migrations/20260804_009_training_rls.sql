-- ─────────────────────────────────────────────────────────────────────────────
-- Training tables RLS policies.
-- These tables are Trainerize mirror tables; we enable RLS so clients can only
-- see their own programs, phases, workouts, and logs.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE client_programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_phases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs       ENABLE ROW LEVEL SECURITY;

-- client_programs: clients see only their own
CREATE POLICY "clients view own programs"
  ON client_programs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- training_phases: accessible if the parent client_program belongs to the client
CREATE POLICY "clients view own training phases"
  ON training_phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_programs cp
      WHERE cp.id = training_phases.client_program_id
        AND cp.client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    )
  );

-- workout_definitions: accessible if the parent training_phase is accessible
CREATE POLICY "clients view own workout definitions"
  ON workout_definitions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_phases tp
      JOIN client_programs cp ON cp.id = tp.client_program_id
      WHERE tp.id = workout_definitions.training_phase_id
        AND cp.client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    )
  );

-- workout_exercises: accessible if the parent workout_definition is accessible
CREATE POLICY "clients view own workout exercises"
  ON workout_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_definitions wd
      JOIN training_phases tp ON tp.id = wd.training_phase_id
      JOIN client_programs cp ON cp.id = tp.client_program_id
      WHERE wd.id = workout_exercises.workout_def_id
        AND cp.client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    )
  );

-- exercises: the exercise library is visible to all authenticated clients
CREATE POLICY "authenticated users view exercise library"
  ON exercises FOR SELECT
  TO authenticated
  USING (true);

-- workout_logs: clients read and write their own logs only
CREATE POLICY "clients view own workout logs"
  ON workout_logs FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients insert own workout logs"
  ON workout_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "clients delete own workout logs"
  ON workout_logs FOR DELETE
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
