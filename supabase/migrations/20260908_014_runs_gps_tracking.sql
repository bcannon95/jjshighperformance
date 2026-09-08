-- ─────────────────────────────────────────────────────────────────────────────
-- GPS Run Tracking Tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Run sessions (metadata)
create table if not exists runs (
  id                  bigint generated always as identity primary key,
  client_id           bigint       not null references clients(id) on delete cascade,
  started_at          timestamptz  not null,
  finished_at         timestamptz,
  distance_m          numeric(10,2) default 0,
  duration_s          integer       default 0,
  avg_pace_s_per_km   integer,
  created_at          timestamptz  default now()
);

create index if not exists runs_client_id_started_at_idx on runs (client_id, started_at desc);

-- GPS waypoints recorded during a run
create table if not exists run_points (
  id           bigint generated always as identity primary key,
  run_id       bigint           not null references runs(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  accuracy_m   numeric(8,2),
  recorded_at  timestamptz      not null
);

create index if not exists run_points_run_id_recorded_at_idx on run_points (run_id, recorded_at asc);

-- ── Row-level security ────────────────────────────────────────────────────────

alter table runs enable row level security;

create policy "clients_select_own_runs" on runs
  for select using (
    client_id in (select id from clients where auth_user_id = auth.uid())
  );

create policy "clients_insert_own_runs" on runs
  for insert with check (
    client_id in (select id from clients where auth_user_id = auth.uid())
  );

create policy "clients_update_own_runs" on runs
  for update using (
    client_id in (select id from clients where auth_user_id = auth.uid())
  );

alter table run_points enable row level security;

create policy "clients_select_own_run_points" on run_points
  for select using (
    run_id in (
      select id from runs
      where client_id in (select id from clients where auth_user_id = auth.uid())
    )
  );

create policy "clients_insert_own_run_points" on run_points
  for insert with check (
    run_id in (
      select id from runs
      where client_id in (select id from clients where auth_user_id = auth.uid())
    )
  );
