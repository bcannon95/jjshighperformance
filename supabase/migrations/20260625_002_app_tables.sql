-- ─────────────────────────────────────────────────────────────────────────────
-- JJS App — tables required by the native mobile app + admin dashboard.
-- These are NOT part of the Trainerize mirror schema; they are new app-native.
-- Run AFTER the Trainerize migration schema is already in place.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. AUTH LINK ─────────────────────────────────────────────────────────────
-- Links a Supabase Auth user (uuid) to a clients row.
-- Populated on first sign-in / account claim flow.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_id_idx ON clients(auth_user_id);


-- ── 2. VIDEO COURSES ─────────────────────────────────────────────────────────
-- Hierarchy: course → lesson (video). Progress tracked per client per lesson.

CREATE TABLE IF NOT EXISTS courses (
  id            bigserial PRIMARY KEY,
  trainer_id    bigint REFERENCES trainers(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text,
  thumbnail_url text,
  order_index   integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'draft', -- draft | published
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id                     bigserial PRIMARY KEY,
  course_id              bigint NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  description            text,
  video_url              text,   -- Mux playback URL or Cloudflare Stream URL
  video_duration_seconds integer,
  thumbnail_url          text,
  order_index            integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id               bigserial PRIMARY KEY,
  client_id        bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lesson_id        bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress_seconds integer NOT NULL DEFAULT 0,
  completed        boolean NOT NULL DEFAULT false,
  completed_at     timestamptz,
  last_watched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, lesson_id)
);


-- ── 3. GPS RUN TRACKING ──────────────────────────────────────────────────────
-- Stores native GPS sessions logged from the mobile app.
-- route_polyline: Google encoded polyline string (compact, renderable on maps).

CREATE TABLE IF NOT EXISTS run_sessions (
  id                 bigserial PRIMARY KEY,
  client_id          bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  started_at         timestamptz NOT NULL,
  completed_at       timestamptz,
  distance_km        numeric,
  duration_seconds   integer,
  avg_pace_sec_per_km integer,  -- e.g. 330 = 5:30/km
  calories_burned    integer,
  avg_heart_rate     integer,
  route_polyline     text,       -- encoded polyline for map rendering
  notes              text,
  source             text NOT NULL DEFAULT 'app',
  created_at         timestamptz NOT NULL DEFAULT now()
);


-- ── 4. MESSAGING ─────────────────────────────────────────────────────────────
-- Supports both 1-to-1 (direct) and group conversations.
-- participant_type distinguishes clients from trainers without a union table.

CREATE TABLE IF NOT EXISTS conversations (
  id         bigserial PRIMARY KEY,
  type       text NOT NULL DEFAULT 'direct', -- direct | group
  group_id   bigint REFERENCES user_groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id  bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_id   bigint NOT NULL,
  participant_type text NOT NULL DEFAULT 'client', -- client | trainer
  joined_at        timestamptz NOT NULL DEFAULT now(),
  last_read_at     timestamptz,
  PRIMARY KEY (conversation_id, participant_id, participant_type)
);

CREATE TABLE IF NOT EXISTS messages (
  id              bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       bigint NOT NULL,
  sender_type     text NOT NULL DEFAULT 'client', -- client | trainer
  body            text,
  media_url       text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_sent_at_idx
  ON messages(conversation_id, sent_at DESC);


-- ── 5. PUSH NOTIFICATIONS ────────────────────────────────────────────────────
-- Stores Expo push tokens (covers both iOS APNs and Android FCM via Expo).

CREATE TABLE IF NOT EXISTS push_tokens (
  id         bigserial PRIMARY KEY,
  client_id  bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL, -- ios | android
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);


-- ── 6. BADGES / ACHIEVEMENTS ─────────────────────────────────────────────────
-- Badges are defined centrally; client_badges records when each was earned.
-- criteria_type + criteria_value drive the awarding logic in the app.

CREATE TABLE IF NOT EXISTS badges (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL,
  description    text,
  icon_url       text,
  criteria_type  text,    -- e.g. workouts_completed | streak_days | weight_lost_kg
  criteria_value numeric,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_badges (
  client_id bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  badge_id  bigint NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, badge_id)
);


-- ── 7. ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────
-- Enable RLS on all new app-native tables.
-- Policies below give clients read/write access to their own rows only.
-- Trainers (admin dashboard) access data via the service role key — no policy needed for that.

ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_badges        ENABLE ROW LEVEL SECURITY;

-- Courses: published courses are visible to all authenticated clients
CREATE POLICY "clients can view published courses"
  ON courses FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Lessons: visible if the parent course is published
CREATE POLICY "clients can view lessons of published courses"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = lessons.course_id AND c.status = 'published'
    )
  );

-- Lesson progress: clients manage their own rows only
CREATE POLICY "clients manage own lesson progress"
  ON lesson_progress FOR ALL
  TO authenticated
  USING (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Run sessions: clients manage their own rows only
CREATE POLICY "clients manage own run sessions"
  ON run_sessions FOR ALL
  TO authenticated
  USING (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Conversations: clients can see conversations they participate in
CREATE POLICY "clients view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN clients cl ON cl.id = cp.participant_id
      WHERE cp.conversation_id = conversations.id
        AND cl.auth_user_id = auth.uid()
        AND cp.participant_type = 'client'
    )
  );

CREATE POLICY "clients view own conversation participation"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    participant_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
    AND participant_type = 'client'
  );

-- Messages: clients can read messages in their conversations, send their own
CREATE POLICY "clients read messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN clients cl ON cl.id = cp.participant_id
      WHERE cp.conversation_id = messages.conversation_id
        AND cl.auth_user_id = auth.uid()
        AND cp.participant_type = 'client'
    )
  );

CREATE POLICY "clients send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
    AND sender_type = 'client'
  );

-- Push tokens: clients manage their own tokens
CREATE POLICY "clients manage own push tokens"
  ON push_tokens FOR ALL
  TO authenticated
  USING (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Badges: all authenticated clients can view badge definitions
CREATE POLICY "clients view badges"
  ON badges FOR SELECT
  TO authenticated
  USING (true);

-- Client badges: clients can only see their own earned badges
CREATE POLICY "clients view own badges"
  ON client_badges FOR SELECT
  TO authenticated
  USING (
    client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );
