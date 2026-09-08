-- Add elevation tracking to runs and run_points
alter table runs add column if not exists elevation_gain_m numeric(8,2) default 0;
alter table run_points add column if not exists altitude_m numeric(8,2);
