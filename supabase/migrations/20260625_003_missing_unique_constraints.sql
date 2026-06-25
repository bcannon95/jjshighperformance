-- Unique constraints required by the migration script's on_conflict clauses.
-- Uses DO blocks to skip constraints that already exist.

DO $$ BEGIN
  ALTER TABLE body_weight_logs ADD CONSTRAINT body_weight_logs_client_id_logged_at_key UNIQUE (client_id, logged_at);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE biometric_logs ADD CONSTRAINT biometric_logs_client_id_logged_at_metric_key UNIQUE (client_id, logged_at, metric);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_client_id_date_key UNIQUE (client_id, date);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE daily_health_data ADD CONSTRAINT daily_health_data_client_id_date_key UNIQUE (client_id, date);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE daily_nutrition_logs ADD CONSTRAINT daily_nutrition_logs_client_id_logged_date_key UNIQUE (client_id, logged_date);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE nutrition_goals ADD CONSTRAINT nutrition_goals_client_id_effective_from_key UNIQUE (client_id, effective_from);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
