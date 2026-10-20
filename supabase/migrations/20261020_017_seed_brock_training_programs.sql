-- ─────────────────────────────────────────────────────────────────────────────
-- Seed Brock Cannon's training programs by mirroring Aaron Brereton's data.
-- Source client_program IDs: all 8 of Aaron Brereton's programs.
-- Target client_id: 26150870 (brockpdcannon@gmail.com)
--
-- IDs are manually assigned above current maximums:
--   client_programs max: 163486388  → start at 200000001
--   training_phases max: 35785723   → start at 40000001
--   workout_definitions max: 221733417 → start at 250000001
--   workout_exercises max: 1867485457  → start at 2000000001
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  src_program   record;
  src_phase     record;
  src_wd        record;
  src_ex        record;
  new_prog_id   bigint;
  new_phase_id  bigint;
  new_wd_id     bigint;
  prog_counter  bigint := 200000000;
  phase_counter bigint := 40000000;
  wd_counter    bigint := 250000000;
  ex_counter    bigint := 2000000000;
BEGIN
  FOR src_program IN
    SELECT *
    FROM client_programs
    WHERE id IN (
      148232155,  -- Off-Legs Conditioning Sessions
      148232266,  -- Solo Skills Sessions
      148232308,  -- Recovery Sessions
      163486381,  -- Game/Training Replacement Conditioning Sessions
      163486382,  -- EDGE Series 24 Week On-Demand
      163486383,  -- EDGE Series
      163486385,  -- 2026 (A/TT) - In-Season STRENGTH
      163486388   -- 2026 In-Season Program - TT (is_main, 97 workouts)
    )
    ORDER BY id
  LOOP
    prog_counter := prog_counter + 1;
    new_prog_id  := prog_counter;

    INSERT INTO client_programs (id, client_id, program_id, name, is_main, start_date, end_date, status)
    VALUES (
      new_prog_id,
      26150870,
      src_program.program_id,
      src_program.name,
      src_program.is_main,
      src_program.start_date,
      src_program.end_date,
      src_program.status
    );

    FOR src_phase IN
      SELECT * FROM training_phases
      WHERE client_program_id = src_program.id
      ORDER BY order_index
    LOOP
      phase_counter := phase_counter + 1;
      new_phase_id  := phase_counter;

      INSERT INTO training_phases (id, client_program_id, name, start_date, end_date, week_count, order_index)
      VALUES (
        new_phase_id,
        new_prog_id,
        src_phase.name,
        src_phase.start_date,
        src_phase.end_date,
        src_phase.week_count,
        src_phase.order_index
      );

      FOR src_wd IN
        SELECT * FROM workout_definitions
        WHERE training_phase_id = src_phase.id
        ORDER BY id
      LOOP
        wd_counter := wd_counter + 1;
        new_wd_id  := wd_counter;

        INSERT INTO workout_definitions (id, training_phase_id, name, description, est_duration_min, equipment)
        VALUES (
          new_wd_id,
          new_phase_id,
          src_wd.name,
          src_wd.description,
          src_wd.est_duration_min,
          src_wd.equipment
        );

        FOR src_ex IN
          SELECT * FROM workout_exercises
          WHERE workout_def_id = src_wd.id
          ORDER BY order_index
        LOOP
          ex_counter := ex_counter + 1;

          INSERT INTO workout_exercises (
            id, workout_def_id, exercise_id, exercise_name, order_index,
            superset_group, sets, reps_min, reps_max, rest_seconds, notes, type
          )
          VALUES (
            ex_counter,
            new_wd_id,
            src_ex.exercise_id,
            src_ex.exercise_name,
            src_ex.order_index,
            src_ex.superset_group,
            src_ex.sets,
            src_ex.reps_min,
            src_ex.reps_max,
            src_ex.rest_seconds,
            src_ex.notes,
            src_ex.type
          );
        END LOOP;

      END LOOP;
    END LOOP;
  END LOOP;
END $$;
