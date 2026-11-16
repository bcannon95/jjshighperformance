-- Strava OAuth connections
CREATE TABLE IF NOT EXISTS strava_connections (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id       bigint NOT NULL UNIQUE,
  strava_athlete_id bigint NOT NULL,
  access_token    text   NOT NULL,
  refresh_token   text   NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- Track run source and Strava activity ID on runs table
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS source             text   NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS strava_activity_id bigint UNIQUE;
