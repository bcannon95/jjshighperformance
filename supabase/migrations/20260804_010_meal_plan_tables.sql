-- ─────────────────────────────────────────────────────────────────────────────
-- Meal plan sub-tables and recipe library.
-- meal_plans already exists as a Trainerize mirror; we add missing columns and
-- create the day/meal/recipe tables the app requires.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. EXTEND meal_plans ─────────────────────────────────────────────────────

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS goal_calories  integer,
  ADD COLUMN IF NOT EXISTS goal_protein_g integer;

-- ── 2. RECIPE LIBRARY ────────────────────────────────────────────────────────
-- Shared across all clients; managed by the trainer via the admin dashboard.

CREATE TABLE IF NOT EXISTS recipes (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  image_url     text,
  calories      integer,
  protein_g     numeric,
  carbs_g       numeric,
  fat_g         numeric,
  serving_size  text,
  prep_minutes  integer,
  cook_minutes  integer,
  allergens     text[],
  tags          text[],
  directions    text[],
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id          bigserial PRIMARY KEY,
  recipe_id   bigint NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name        text,
  quantity    text,
  unit        text,
  order_index integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_alternatives (
  recipe_id             bigint NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  alternative_recipe_id bigint NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, alternative_recipe_id)
);

-- ── 3. MEAL PLAN DAYS & MEALS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plan_days (
  id           bigserial PRIMARY KEY,
  meal_plan_id bigint NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_number   integer NOT NULL,
  UNIQUE (meal_plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id              bigserial PRIMARY KEY,
  meal_plan_day_id bigint NOT NULL REFERENCES meal_plan_days(id) ON DELETE CASCADE,
  recipe_id       bigint REFERENCES recipes(id) ON DELETE SET NULL,
  category        text NOT NULL DEFAULT 'Snack', -- Breakfast | Lunch | Snack | Dinner
  order_index     integer NOT NULL DEFAULT 0
);

-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE meal_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_meals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_alternatives ENABLE ROW LEVEL SECURITY;

-- meal_plans: clients see their own only
CREATE POLICY "clients view own meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- meal_plan_days: accessible if the parent meal_plan belongs to the client
CREATE POLICY "clients view own meal plan days"
  ON meal_plan_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_days.meal_plan_id
        AND mp.client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    )
  );

-- meal_plan_meals: accessible if the parent day is accessible
CREATE POLICY "clients view own meal plan meals"
  ON meal_plan_meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_days mpd
      JOIN meal_plans mp ON mp.id = mpd.meal_plan_id
      WHERE mpd.id = meal_plan_meals.meal_plan_day_id
        AND mp.client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    )
  );

-- Recipe library: all authenticated clients can read
CREATE POLICY "authenticated users view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated users view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated users view recipe alternatives"
  ON recipe_alternatives FOR SELECT
  TO authenticated
  USING (true);
