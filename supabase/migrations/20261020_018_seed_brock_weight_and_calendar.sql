-- ─────────────────────────────────────────────────────────────────────────────
-- Seed body weight history + calendar events for Brock Cannon (client_id 26150870).
-- Weight values are placeholders — update via the app with real figures.
-- Calendar events mirror a typical AFL in-season week pattern.
-- Today: 2026-10-20 (Tuesday)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Body weight logs (12 weekly entries, late Jul → mid Oct 2026) ─────────────
-- NOTE: Replace these weight values with real ones via the app.

INSERT INTO body_weight_logs (client_id, weight_kg, logged_at) VALUES
  (26150870, 90.2, '2026-07-29 07:30:00+10'),
  (26150870, 89.8, '2026-08-05 07:30:00+10'),
  (26150870, 90.1, '2026-08-12 07:30:00+10'),
  (26150870, 89.5, '2026-08-19 07:30:00+10'),
  (26150870, 89.3, '2026-08-26 07:30:00+10'),
  (26150870, 88.9, '2026-09-02 07:30:00+10'),
  (26150870, 89.2, '2026-09-09 07:30:00+10'),
  (26150870, 88.7, '2026-09-16 07:30:00+10'),
  (26150870, 88.5, '2026-09-23 07:30:00+10'),
  (26150870, 88.8, '2026-09-30 07:30:00+10'),
  (26150870, 88.3, '2026-10-07 07:30:00+10'),
  (26150870, 88.1, '2026-10-14 07:30:00+10');


-- ── Calendar events ────────────────────────────────────────────────────────────
-- IDs start at 1800000000000 (well above current max of 1787563502838).
-- Completed events have completed_at set; upcoming are NULL.
-- Pattern: Mon recovery, Tue T1 training, Thu T2 training, Fri pre-game, Sat/Sun game

INSERT INTO calendar_events (id, client_id, event_type, scheduled_date, notes, status, completed_at) VALUES

  -- ── Week of 5 Oct ──────────────────────────────────────────────────────────
  (1800000000001, 26150870, 'workout',    '2026-10-05', 'Flush Run Recovery #1',          'completed', '2026-10-05 09:15:00+10'),
  (1800000000002, 26150870, 'workout',    '2026-10-06', 'T1 Club Training Data',           'completed', '2026-10-06 16:30:00+10'),
  (1800000000003, 26150870, 'activity',   '2026-10-07', 'Top-Up Running #1 - Fartlek #1',  'completed', '2026-10-07 07:00:00+10'),
  (1800000000004, 26150870, 'workout',    '2026-10-08', 'T2 Club Training Data',           'completed', '2026-10-08 16:30:00+10'),
  (1800000000005, 26150870, 'workout',    '2026-10-09', 'Pre-game Activation & Mobility #1','completed', '2026-10-09 14:00:00+10'),
  (1800000000006, 26150870, 'workout',    '2026-10-11', 'Game Day Data & Review',          'completed', '2026-10-11 18:00:00+10'),

  -- ── Week of 12 Oct ─────────────────────────────────────────────────────────
  (1800000000007, 26150870, 'workout',    '2026-10-12', 'Flush Run Recovery #2',           'completed', '2026-10-12 09:00:00+10'),
  (1800000000008, 26150870, 'bodystats',  '2026-10-12', 'Body Stats',                      'completed', '2026-10-12 07:30:00+10'),
  (1800000000009, 26150870, 'workout',    '2026-10-13', 'T1 Club Training Data',           'completed', '2026-10-13 16:30:00+10'),
  (1800000000010, 26150870, 'activity',   '2026-10-14', 'Top-Up Running #2 - Fast/Slow Circuit', 'completed', '2026-10-14 07:00:00+10'),
  (1800000000011, 26150870, 'workout',    '2026-10-15', 'T2 Club Training Data',           'completed', '2026-10-15 16:30:00+10'),
  (1800000000012, 26150870, 'workout',    '2026-10-16', 'Pre-game Activation & Mobility #2','completed', '2026-10-16 14:00:00+10'),
  (1800000000013, 26150870, 'workout',    '2026-10-18', 'Game Day Data & Review',          'completed', '2026-10-18 18:00:00+10'),

  -- ── Week of 19 Oct (current week) ──────────────────────────────────────────
  (1800000000014, 26150870, 'workout',    '2026-10-19', 'Flush Run Recovery #1',           'completed', '2026-10-19 09:00:00+10'),
  (1800000000015, 26150870, 'bodystats',  '2026-10-19', 'Body Stats',                      'completed', '2026-10-19 07:30:00+10'),
  -- Today (2026-10-20, Tuesday)
  (1800000000016, 26150870, 'workout',    '2026-10-20', 'T1 Club Training Data',           'scheduled', NULL),
  (1800000000017, 26150870, 'activity',   '2026-10-20', 'Top-Up Running #3 - 10 x 100m',  'scheduled', NULL),
  -- Upcoming
  (1800000000018, 26150870, 'workout',    '2026-10-22', 'T2 Club Training Data',           'scheduled', NULL),
  (1800000000019, 26150870, 'workout',    '2026-10-23', 'Pre-game Activation & Mobility #3','scheduled', NULL),
  (1800000000020, 26150870, 'workout',    '2026-10-25', 'Game Day Data & Review',          'scheduled', NULL);
