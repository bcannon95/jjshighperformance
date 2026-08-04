-- ─────────────────────────────────────────────────────────────────────────────
-- Seed badge definitions.
-- icon_url stores emoji for the web/prototype; swap for CDN URLs in production.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO badges (name, description, icon_url, criteria_type, criteria_value)
VALUES
  ('First Workout',      'Completed your first workout',              '🏆', 'workouts_completed',  1),
  ('7-Day Streak',       'Worked out 7 days in a row',                '🔥', 'streak_days',         7),
  ('Strength Milestone', 'Lifted 100kg for the first time',           '💪', 'max_lift_kg',         100),
  ('Nutrition Pro',      'Hit your macros 5 days straight',           '🥗', 'macro_streak_days',   5),
  ('Speed Demon',        'Completed a workout in under 30 minutes',   '⚡', 'workout_duration_min', 30),
  ('Goal Setter',        'Set your first fitness goal',               '🎯', 'goals_set',           1),
  ('30-Day Streak',      'Work out 30 days in a row',                 '🌟', 'streak_days',         30),
  ('Beast Mode',         'Lift 150kg in a single session',            '🏋️', 'max_lift_kg',         150),
  ('Consistency King',   'Complete 50 workouts total',                '🚀', 'workouts_completed',  50),
  ('Elite Athlete',      'Reach level 10 fitness score',              '🎖️', 'fitness_score',       10)
ON CONFLICT DO NOTHING;
