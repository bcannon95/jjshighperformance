-- Fix: nutrition_goals macro columns were integer but daily_nutrition_logs uses numeric.
-- Trainerize API can return decimals for goal macros; bump to numeric for consistency.

ALTER TABLE nutrition_goals
  ALTER COLUMN protein_g TYPE numeric,
  ALTER COLUMN carbs_g    TYPE numeric,
  ALTER COLUMN fat_g      TYPE numeric,
  ALTER COLUMN fiber_g    TYPE numeric;
