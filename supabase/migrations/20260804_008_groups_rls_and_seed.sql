-- ─────────────────────────────────────────────────────────────────────────────
-- Groups: add is_private flag, enable RLS, and seed group definitions.
-- user_groups / user_group_members are Trainerize mirror tables; we extend them.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_groups ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

ALTER TABLE user_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;

-- All authenticated users can browse groups and see member counts
CREATE POLICY "authenticated users view groups"
  ON user_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated users view group members"
  ON user_group_members FOR SELECT
  TO authenticated
  USING (true);

-- Clients can join groups
CREATE POLICY "clients can join groups"
  ON user_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Clients can leave groups
CREATE POLICY "clients can leave groups"
  ON user_group_members FOR DELETE
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Seed group definitions
-- icon_url stores emoji for the web/prototype; swap for CDN URLs in production.
INSERT INTO user_groups (name, description, icon_url, is_private)
VALUES
  ('Weight Loss Warriors', 'Support group for sustainable weight loss journeys',          '⚖️',  false),
  ('Strength & Power',     'Heavy lifting, powerlifting, and strength training focused',  '🏋️', false),
  ('JJS Health Clients',   'Private group for JJS Health & Fitness clients only',         '🌟',  true),
  ('Morning Warriors',     'Early risers who train before 7am every day',                 '🌅',  false),
  ('Nutrition Nerds',      'Deep dive into nutrition science and meal planning',           '🥗',  false),
  ('Running Club',         'Casual and competitive runners of all abilities welcome',      '🏃',  false);
